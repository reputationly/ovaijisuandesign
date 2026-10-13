#!/bin/bash
# usage: fetchv.sh pkg regex  -> downloads versions matching regex
pkg=$1; re=$2
for v in $(npm view "$pkg" versions --json | node -e 'const a=JSON.parse(require("fs").readFileSync(0));const r=new RegExp(process.argv[1]);for(const v of a) if(r.test(v)&&!/canary|nightly/.test(v)) console.log(v)' "$re"); do
  d="${pkg//\//__}@$v"; [ -d "$d/package" ] && continue
  mkdir -p "$d" && (cd "$d" && t=$(npm pack "$pkg@$v" --silent 2>/dev/null | tail -1) && tar xzf "$t" && rm -f "$t") || echo "FAIL $pkg@$v"
done
