/**
 * Returns true if `url` starts with any of the given prefixes.
 * Used to gate which fetch calls get traced.
 */
export function matchesPrefixes(url, prefixes) {
    return prefixes.some((prefix) => url.startsWith(prefix));
}
//# sourceMappingURL=url-filter.js.map