// Keep the captured reference source in Git, but do not publish its owner's work.
const templatePrefixes = ['/projects/nocode', '/projects/betatesta', '/projects/fiilo', '/projects/beta-directory', '/projects/archive', '/projects/old-site', '/assets/old-site', '/writing', '/downloads', '/vr'];
export function isRetiredPath(path) {
  const normalized = '/' + path.replaceAll('\\', '/').replace(/^\/+/, '');
  return templatePrefixes.some(prefix => normalized === prefix || normalized.startsWith(prefix + '/'));
}
