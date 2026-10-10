// 更新日志页路由入口：左侧版本封面跟随悬停的条目，右侧列表与详情弹窗。
import { useTranslation, useSearch, reactExports } from "../vendor.js";
import { useLoginGuard } from "../infra/schedule.js";
import { useChangelog } from "../settings/use-active-runtime.js";
import { ChangelogTable } from "../settings/changelog-table.jsx";
import { ChangelogDetailDialog } from "../settings/changelog-detail-dialog.jsx";
import { __jsx } from "../shared/jsx-runtime.js";
import { FeaturedCard } from "./featured-card.jsx";
import { buildChangelogRows, pickLocale } from "./rows.js";
function ChangelogPage() {
  const { i18n } = useTranslation();
  const { LoginDialog } = useLoginGuard();
  const { targetId } = useSearch({
    from: "/_home/changelog/",
  });
  const { manifest: changelogManifest } = useChangelog();
  const [hoveredRow, setHoveredRow] = reactExports.useState(null);
  const [selectedRow, setSelectedRow] = reactExports.useState(null);
  const changelogLocale = reactExports.useMemo(
    () => changelogManifest[pickLocale(i18n.language)],
    [changelogManifest, i18n.language],
  );
  const rows = reactExports.useMemo(() => buildChangelogRows(changelogLocale), [changelogLocale]);
  const featuredItem = reactExports.useMemo(
    () => rows.find((item) => item.featured) || rows[0],
    [rows],
  );
  const activeFeatured = hoveredRow || featuredItem;
  reactExports.useEffect(() => {
    if (!targetId) return;
    const target = rows.find((row) => row.id === targetId);
    if (target) setSelectedRow(target);
  }, [rows, targetId]);
  return (
    <main className="flex-1 flex overflow-hidden">
      {LoginDialog}
      <div className="shrink-0 p-10 sticky top-0 self-start">
        {activeFeatured && (
          <FeaturedCard version={activeFeatured.version} title={changelogLocale.title} />
        )}
      </div>
      <div className="home-fade-up flex-1 min-w-0 overflow-y-auto p-10 pl-0">
        <ChangelogTable rows={rows} onRowClick={setSelectedRow} onRowHover={setHoveredRow} />
      </div>
      <ChangelogDetailDialog item={selectedRow} onClose={() => setSelectedRow(null)} />
    </main>
  );
}
const SplitComponent = ChangelogPage;
export { SplitComponent as component };
