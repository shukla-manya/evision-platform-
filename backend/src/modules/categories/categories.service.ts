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

  async listAll(): Promise<any[]> {
    const items = await this.dynamo.scan({ TableName: this.table() });
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
    if (dto.parent_id) {
      const parent = await this.getById(dto.parent_id);
      if (!parent) throw new BadRequestException('Parent category not found');
    }
    const id = uuidv4();
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
    if (dto.parent_id) {
      if (dto.parent_id === id) throw new BadRequestException('Category cannot be its own parent');
      await this.requireCategory(dto.parent_id);
    }
    const updates: Record<string, any> = {};
    if (dto.name !== undefined) updates.name = dto.name.trim();
    if (dto.parent_id !== undefined) updates.parent_id = dto.parent_id;
    updates.updated_at = new Date().toISOString();
    return this.dynamo.update(this.table(), { id }, updates);
  }

  async remove(id: string): Promise<void> {
    await this.requireCategory(id);
    await this.dynamo.delete(this.table(), { id });
  }
}
