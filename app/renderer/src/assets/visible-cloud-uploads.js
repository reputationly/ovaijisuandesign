// 云上传列表的可见项过滤。


function isVisibleCloudUpload(item) {
  return item.kind === "upload" && (item.status === "pending" || item.status === "uploading");
}
export function getVisibleCloudUploads(transfers, searchQuery) {
  const query = searchQuery.trim().toLowerCase();
  return transfers.filter(item => isVisibleCloudUpload(item) && item.name.toLowerCase().includes(query));
}
