# GitHub Pages 部署步骤

## 1. 新建仓库

在 GitHub 新建公开仓库，建议仓库名：

```text
winder-knowledge-site
```

## 2. 上传文件

把项目根目录中的所有文件上传到仓库根目录。仓库根目录必须能直接看到：

```text
index.html
style.css
script.js
data/
images/
docs/
README.md
.nojekyll
```

不要只上传 `docs/`，也不要把项目再套一层文件夹。

## 3. 开启 GitHub Pages

1. 打开仓库 `Settings`。
2. 进入 `Pages`。
3. `Build and deployment` 选择 `Deploy from a branch`。
4. `Branch` 选择 `main`。
5. 目录选择 `/root`。
6. 点击 `Save`。

## 4. 公网访问地址

发布完成后，公网地址格式为：

```text
https://你的GitHub用户名.github.io/winder-knowledge-site/
```

手机浏览器可以直接打开这个地址。
