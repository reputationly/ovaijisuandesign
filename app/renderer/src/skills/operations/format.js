// 运营后台的时间显示格式。
export const formatOperationTime = (timestamp, language) =>
  timestamp > 0
    ? new Intl.DateTimeFormat(language, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(timestamp))
    : "-";
