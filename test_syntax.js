const fs = require("fs");
const html = fs.readFileSync("dash.html", "utf8");
const start = html.indexOf("Chart.defaults");
const end = html.indexOf("</script>", start);
const code = html.substring(start, end);

// Write to temp file
fs.writeFileSync("/tmp/dash_check.js", code);
