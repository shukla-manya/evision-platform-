import { useLayoutEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { publicShopBrandMark } from '../config/publicMarketing';
import { publicWebUrl } from '../config/publicWeb';
import { formatBlogDateLong, formatBlogDateShort, getBlogPostBySlug, getBlogPostsSorted } from '../lib/blog-posts';
import { colors } from '../theme/colors';
import { screenGutter } from '../theme/layout';

type RootBlogParams = {
  Blog: undefined;
  BlogPost: { slug: string };
};

export function BlogListScreen({ navigation }: NativeStackScreenProps<RootBlogParams, 'Blog'>) {
  const posts = getBlogPostsSorted();

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.listPad} keyboardShouldPersistTaps="handled">
        <Text style={styles.brandMark}>{publicShopBrandMark}</Text>
        <Text style={styles.pageTitle}>Blog</Text>
        <Text style={styles.lead}>
          CCTV guides: 4G without WiFi, IP basics, bullet vs dome, and why IP fits modern Indian sites.
        </Text>

        {posts.map((post) => (
          <View key={post.slug} style={styles.card}>
            <View style={styles.rowTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.author.initials}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.metaLine}>
                  {post.author.name} · {post.commentCount} Comments · {post.category} · {formatBlogDateShort(post.publishedAt)}
                </Text>
                <Pressable onPress={() => navigation.navigate('BlogPost', { slug: post.slug })}>
                  <Text style={styles.postTitle}>{post.title}</Text>
                </Pressable>
                <Text style={styles.excerpt} numberOfLines={4}>
                  {post.excerpt}
                </Text>
                <Pressable onPress={() => navigation.navigate('BlogPost', { slug: post.slug })} style={styles.continueHit}>
                  <Text style={styles.continueText}>Continue reading</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        <Text style={styles.sideHeading}>Recent posts</Text>
        {posts.map((p) => (
          <Pressable key={p.slug + '-side'} style={styles.sideRow} onPress={() => navigation.navigate('BlogPost', { slug: p.slug })}>
            <Text style={styles.sideTitle}>{p.title}</Text>
            <Text style={styles.sideMeta}>
              {formatBlogDateLong(p.publishedAt)} · No comments
            </Text>
          </Pressable>
        ))}

        <View style={styles.promo}>
          <Text style={styles.promoBadge}>ON SALE</Text>
          <Text style={styles.promoTitle}>4G Watch Pro</Text>
          <Text style={styles.promoSub}>Outdoor 4G — open the web shop for live pricing.</Text>
          <Pressable style={styles.promoBtn} onPress={() => void Linking.openURL(publicWebUrl('/shop?search=4G+Watch'))}>
            <Text style={styles.promoBtnText}>To shop</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

export function BlogPostScreen({ route, navigation }: NativeStackScreenProps<RootBlogParams, 'BlogPost'>) {
  const post = getBlogPostBySlug(route.params.slug);

  useLayoutEffect(() => {
    if (!post) {
      navigation.setOptions({ title: 'Not found' });
      return;
    }
    const t = post.title;
    navigation.setOptions({ title: t.length > 34 ? `${t.slice(0, 31)}…` : t });
  }, [navigation, post]);

  if (!post) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={[styles.listPad, { gap: 12 }]}>
          <Text style={styles.pageTitle}>Article not found</Text>
          <Pressable onPress={() => navigation.navigate('Blog')}>
            <Text style={styles.continueText}>← Back to blog</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.listPad} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.navigate('Blog')} style={{ marginBottom: 12 }}>
          <Text style={styles.continueText}>← Blog</Text>
        </Pressable>
        <View style={styles.articleByline}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.author.initials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.metaLine}>
              {post.author.name} · {formatBlogDateShort(post.publishedAt)} · {post.commentCount} comments
            </Text>
          </View>
        </View>
        <Text style={styles.articleTitle}>{post.title}</Text>
        <Text style={styles.excerpt}>{post.excerpt}</Text>
        {post.body.map((para, i) => (
          <Text key={i} style={styles.bodyPara}>
            {para}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  listPad: { paddingHorizontal: screenGutter, paddingTop: 16, paddingBottom: 32, gap: 4 },
  brandMark: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandPrimary,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginTop: 6 },
  lead: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 21 },
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  articleByline: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.softPanel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: colors.brandPrimary },
  metaLine: { fontSize: 11, color: colors.muted, lineHeight: 16 },
  postTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, marginTop: 6 },
  excerpt: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  continueHit: { alignSelf: 'flex-start', marginTop: 10 },
  continueText: { fontSize: 14, fontWeight: '700', color: colors.brandPrimary },
  sideHeading: { fontSize: 11, fontWeight: '800', color: colors.textPrimary, marginTop: 20, letterSpacing: 0.8, textTransform: 'uppercase' },
  sideRow: { marginTop: 10, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  sideTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  sideMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
  promo: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  promoBadge: {
    backgroundColor: colors.brandPrimary,
    color: '#fff',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingVertical: 6,
    textTransform: 'uppercase',
  },
  promoTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, paddingHorizontal: 14, paddingTop: 12 },
  promoSub: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: 14, marginTop: 4 },
  promoBtn: {
    marginHorizontal: 14,
    marginVertical: 14,
    backgroundColor: colors.brandPrimary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  promoBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  articleTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginTop: 12, lineHeight: 28 },
  bodyPara: { fontSize: 15, color: colors.textSecondary, marginTop: 14, lineHeight: 24 },
});
