import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private dynamo: DynamoService) {}

  private table() {
    return this.dynamo.tableName('categories');
  }

  private productsTable() {
    return this.dynamo.tableName('products');
  }

  /** Walk ancestors from `parentId`; throws if `categoryId` appears (would create a cycle). */
  private async assertParentChainAcyclic(categoryId: string, parentId: string | null): Promise<void> {
    if (!parentId) return;
    if (parentId === categoryId) {
      throw new BadRequestException('Category cannot be its own parent');
    }
    const seen = new Set<string>();
    let current: string | null | undefined = parentId;
    while (current) {
      if (current === categoryId) {
        throw new BadRequestException('Invalid parent: would create a circular category hierarchy');
      }
      if (seen.has(current)) {
        throw new BadRequestException('Existing category data has a parent cycle; fix parents first');
      }
      seen.add(current);
      const row = await this.getById(current);
      if (!row) break;
      current = (row.parent_id as string | null | undefined) ?? null;
    }
  }

  private async categoryHasProducts(categoryId: string): Promise<boolean> {
    const items = await this.dynamo.query({
      TableName: this.productsTable(),
      IndexName: 'CategoryIndex',
      KeyConditionExpression: 'category_id = :cid',
      ExpressionAttributeValues: { ':cid': categoryId },
      Limit: 1,
      ProjectionExpression: 'id',
    });
    return items.length > 0;
  }

  private async categoryHasChildren(categoryId: string): Promise<boolean> {
    const items = await this.dynamo.scanAllPages({
      TableName: this.table(),
      FilterExpression: 'parent_id = :pid',
      ExpressionAttributeValues: { ':pid': categoryId },
      ProjectionExpression: 'id',
    });
    return items.length > 0;
  }

  async listAll(): Promise<any[]> {
    const items = await this.dynamo.scanAllPages({ TableName: this.table() });
    return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async getById(id: string): Promise<any | null> {
    return this.dynamo.get(this.table(), { id });
  }

  async requireCategory(id: string): Promise<any> {
    const c = await this.getById(id);
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  async create(dto: CreateCategoryDto): Promise<any> {
    const id = uuidv4();
    if (dto.parent_id) {
      const parent = await this.getById(dto.parent_id);
      if (!parent) throw new BadRequestException('Parent category not found');
      await this.assertParentChainAcyclic(id, dto.parent_id);
    }
    const item = {
      id,
      name: dto.name.trim(),
      parent_id: dto.parent_id || null,
      created_at: new Date().toISOString(),
    };
    await this.dynamo.put(this.table(), item);
    return item;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<any> {
    await this.requireCategory(id);
    const nextParent =
      dto.parent_id !== undefined ? (dto.parent_id === '' ? null : dto.parent_id) : undefined;
    if (nextParent !== undefined && nextParent !== null) {
      if (nextParent === id) throw new BadRequestException('Category cannot be its own parent');
      await this.requireCategory(nextParent);
      await this.assertParentChainAcyclic(id, nextParent);
    }
    const updates: Record<string, any> = {};
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.parent_id !== undefined) {
      updates.parent_id = dto.parent_id === '' ? null : dto.parent_id;
    }
    updates.updated_at = new Date().toISOString();
    return this.dynamo.update(this.table(), { id }, updates);
  }

  async remove(id: string): Promise<void> {
    await this.requireCategory(id);
    if (await this.categoryHasChildren(id)) {
      throw new BadRequestException('Cannot delete category that has subcategories; delete or reassign them first');
    }
    if (await this.categoryHasProducts(id)) {
      throw new BadRequestException('Cannot delete category that is still assigned to products');
    }
    await this.dynamo.delete(this.table(), { id });
  }
}
