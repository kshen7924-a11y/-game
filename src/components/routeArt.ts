const illustrations = import.meta.glob<string>('../assets/images/summit_art_*.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
});

export function getRouteArt(originalPath: string): string {
  return illustrations[originalPath.replace('/src/', '../')] ?? originalPath;
}
