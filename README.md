# 锂电池卷绕机工作资料库网站

这是一个纯静态资料管理网站，适合整理方形锂电池卷绕机现场学习资料、报警资料、故障案例、点检保养和产量良率统计。

## 当前项目类型

当前项目是纯 HTML + CSS + JavaScript 静态网站。

不是 Vite、React、Vue 项目，也不是 Node 后端项目。网站数据保存在 `data/*.json`，可以部署到 GitHub Pages、Vercel Static Site 或 Render Static Site。

## 主要功能

- 登录后进入资料库
- 首页常用入口
- 资料管理：关键词搜索、一级分类筛选、文件类型筛选、资料详情
- PLC学习区、卷绕机资料区、CCD资料、报警查询、故障知识库
- 产量良率计算
- 手机和电脑自适应浏览
- 内部原始文件不上传公网，只发布加密后的资料索引和摘要

## 资料整理结果

本项目已从资料目录生成以下数据文件：

- `data/document_index.json`
- `data/alarm_codes.json`
- `data/fault_cases.json`
- `data/plc_notes.json`
- `data/servo_notes.json`
- `data/ccd_notes.json`
- `data/pneumatic_notes.json`
- `data/bom_parts.json`
- `data/maintenance.json`
- `data/production_quality.json`
- `data/security_report.json`

`security_report.json` 只保存统计结果，不保存本机真实路径。内部资料卡片里的 `file_path` 使用 `internal://document/...` 形式，不暴露原始文件位置。

## 重要安全说明

GitHub Pages 是静态网站，前端登录密码不能真正保护内部资料。浏览器端的登录只能挡住普通误访问，不能等同于服务器权限控制。

当前版本做了这些降低风险的处理：

- 不上传 `00_分类整理` 原始资料目录
- 不上传 `docs_internal`、`private_docs`、`extracted_docs`
- 不写入本机真实路径
- 内部资料统一标记 `is_internal: true`
- 内部资料索引使用 AES-GCM 加密，登录后在浏览器解密
- 资料详情只显示摘要；原始文件入口对内部资料禁用

如果资料包含公司名称、设备编号、客户信息、工艺参数、程序备份、图纸、合同、报价、项目文件等，不建议放在公开仓库或公开静态网站。更安全的方案是：

- 使用 Cloudflare Access 保护整个站点
- 使用 Vercel/Render 后端登录，把资料放在服务端鉴权之后
- 使用公司内网服务器、VPN、NAS 或私有对象存储
- GitHub 仓库设为 Private，不把内部资料发布到公网路径

## 更新资料方法

1. 把资料放在项目同级的 `00_分类整理` 文件夹，或设置环境变量 `WINDER_SOURCE_DIR` 指向资料目录。
2. 不要把内部原始文件复制到网站目录。
3. 运行资料索引生成脚本：

```powershell
python tools/build_internal_index.py
```

4. 检查 `data/security_report.json` 的统计结果。
5. 提交并推送 `index.html`、`style.css`、`script.js`、`data/*.json`、`README.md` 等网站文件。

## GitHub Pages 部署步骤

1. 在 GitHub 新建仓库，例如 `winder-knowledge-site`。
2. 上传项目根目录里的文件，确保根目录有 `index.html`。
3. 不要上传 `00_分类整理`、`docs_internal`、`private_docs`、`extracted_docs`。
4. 进入仓库 `Settings` → `Pages`。
5. Source 选择 `Deploy from a branch`。
6. Branch 选择 `main`，目录选择 `/ (root)`。
7. 保存后等待 Pages 构建完成。

部署完成后的公网网址格式：

```text
https://你的用户名.github.io/winder-knowledge-site/
```

手机浏览器直接打开这个 HTTPS 公网地址即可访问。

## Vercel 部署步骤

1. 将仓库推送到 GitHub。
2. 登录 Vercel，选择 `Add New Project`。
3. 导入 `winder-knowledge-site` 仓库。
4. Framework Preset 选择 `Other`。
5. Build Command 留空。
6. Output Directory 留空或填写 `.`。
7. 部署完成后，手机打开 Vercel 分配的 HTTPS 地址。

如果需要真正登录保护，建议升级为 Vercel Functions 或其他后端鉴权，不要只依赖前端密码。

## Render 部署步骤

1. 将仓库推送到 GitHub。
2. 登录 Render，创建 `Static Site`。
3. 连接 `winder-knowledge-site` 仓库。
4. Build Command 留空。
5. Publish Directory 填写 `.`。
6. 部署完成后，手机打开 Render 分配的 HTTPS 地址。

## 手机访问检查

部署后用手机浏览器检查：

- 页面宽度是否适配手机
- 登录页是否能输入账号和密码
- 资料管理是否能显示资料卡片
- 搜索框是否可用
- 一级分类和文件类型筛选是否可用
- 报警代码查询是否可用
- 故障现象搜索是否可用
- 资料详情页是否能打开
- 图片是否正常显示
- JSON 数据是否正常加载

## 项目结构

```text
index.html
style.css
script.js
data/
  alarm.json
  alarm_codes.json
  document_index.json
  plc_notes.json
  servo_notes.json
  winding_notes.json
  ccd_notes.json
  pneumatic_notes.json
  fault_cases.json
  bom_parts.json
  maintenance.json
  production_quality.json
  source_links.json
  security_report.json
docs/
images/
tools/
  build_internal_index.py
README.md
```
