#!/bin/bash
# usage: fetch.sh pkg  -> downloads every published version (excluding canary/nightly/experimental) into pkgs/<pkg>@<v>/package
pkg=$1
for v in $(npm view "$pkg" versions --json | node -e 'const a=JSON.parse(require("fs").readFileSync(0));for(const v of a) if(!/canary|nightly|experimental|i905/.test(v)) console.log(v)'); do
  d="${pkg//\//__}@$v"
  [ -d "$d/package" ] && continue
  mkdir -p "$d" && (cd "$d" && t=$(npm pack "$pkg@$v" --silent 2>/dev/null | tail -1) && tar xzf "$t" && rm -f "$t") || echo "FAIL $pkg@$v"
done
