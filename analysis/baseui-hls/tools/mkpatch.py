import os, re, shutil, subprocess
P = os.path.expanduser("~/baseui-hls-analysis/pkgs")
OUT = os.path.expanduser("~/baseui-hls-analysis/patch")
def edit(root, rel, pairs):
    f = os.path.join(root, rel); s = open(f).read()
    for old, new, rx in pairs:
        if rx:
            s2, n = re.subn(old, new, s, count=1, flags=re.S)
        else:
            n = s.count(old); s2 = s.replace(old, new, 1)
        assert n >= 1, (rel, old[:60]); s = s2
    open(f, "w").write(s)
TB = r"  if \(context === undefined && !optional\) \{\n    throw [^\n]*\n  \}\n"
MB = r"  if \(context === null && !optional\) \{\n    throw [^\n]*\n  \}\n"
DLG = ("parentContext: parentDialogRootContext?.store.context,\n    onOpenChange,\n    triggerIdProp\n", "parentContext: parentDialogRootContext?.store.context\n", False)
JOBS = {
  ("@base-ui__react@1.3.0", "base-ui-react-1.3.0.buildeq.patch"): {
    "esm/utils/createBaseUIEventDetails.js": [(r"(export function createGenericEventDetails\(reason, event, customProperties\) \{\n  const custom = )customProperties \?\? EMPTY_OBJECT;", r"\1EMPTY_OBJECT;", True)],
    "esm/toolbar/root/ToolbarRootContext.js": [(TB, "", True)],
    "esm/menubar/MenubarContext.js": [(MB, "", True)],
    "esm/menu/popup/MenuPopup.js": [("useToolbarRootContext(true)", "useToolbarRootContext()", False)],
    "esm/select/popup/SelectPopup.js": [("useToolbarRootContext(true)", "useToolbarRootContext()", False)],
    "esm/popover/popup/PopoverPopup.js": [("useToolbarRootContext(true)", "useToolbarRootContext()", False)],
    "esm/toggle-group/ToggleGroup.js": [("useToolbarRootContext(true)", "useToolbarRootContext()", False)],
    "esm/menu/trigger/MenuTrigger.js": [("const menubarContext = useMenubarContext(true);", "const menubarContext = useMenubarContext();", False)],
    "esm/dialog/root/DialogRoot.js": [DLG],
    "esm/alert-dialog/root/AlertDialogRoot.js": [DLG],
  },
  ("@base-ui__utils@0.2.6", "base-ui-utils-0.2.6.buildeq.patch"): {
    "esm/store/createSelector.js": [(r"  if \(a && b && c && d && e && f\) \{\n.*?\n  \} else if \(a\) \{\n", "  if (a) {\n", True)],
  },
}
for (pkg, pname), files in JOBS.items():
    work = os.path.join(OUT, "work"); shutil.rmtree(work, ignore_errors=True)
    os.makedirs(os.path.join(work, "a")); os.makedirs(os.path.join(work, "b"))
    patch = ""
    for rel, pairs in files.items():
        for side in "ab":
            d = os.path.join(work, side, "package", os.path.dirname(rel)); os.makedirs(d, exist_ok=True)
            shutil.copy(os.path.join(P, pkg, "package", rel), d)
        edit(os.path.join(work, "b", "package"), rel, pairs)
        r = subprocess.run(["diff", "-u", "a/package/" + rel, "b/package/" + rel], cwd=work, capture_output=True, text=True)
        patch += r.stdout
    open(os.path.join(OUT, pname), "w").write(patch)
    dst = os.path.join(P, pkg.replace("@1.3.0", "@1.3.0-buildeq").replace("@0.2.6", "@0.2.6-buildeq"))
    shutil.rmtree(dst, ignore_errors=True); shutil.copytree(os.path.join(P, pkg), dst)
    r = subprocess.run(["patch", "-p1", "--dry-run", "-i", os.path.join(OUT, pname)], cwd=dst, capture_output=True, text=True); assert r.returncode == 0, r.stdout
    r = subprocess.run(["patch", "-p1", "-i", os.path.join(OUT, pname)], cwd=dst, capture_output=True, text=True)
    print(pname, "applied:", r.returncode, r.stdout.count("patching file"), "files,", patch.count("\n-") , "-lines", patch.count("\n+"), "+lines (含文件头)")
    shutil.rmtree(work)
