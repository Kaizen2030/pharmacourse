import fs from "node:fs"

const indexPath = "public/pos/index.html"
let html = fs.readFileSync(indexPath, "utf8")
html = html.replace(/(["'])\.\/assets\//g, "$1/pos/assets/")
if (!html.includes('<base href="/pos/"')) {
  html = html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n    <base href="/pos/" />')
}
fs.writeFileSync(indexPath, html)
