# 更新资料方法

所有资料都保存在 `data/` 目录的 JSON 文件中，不依赖本地数据库。

## 文件说明

```text
data/alarm.json          报警代码
data/plc_notes.json      PLC学习笔记
data/winding_notes.json  卷绕机资料
data/ccd_notes.json      CCD资料
data/fault_cases.json    故障案例
```

## 更新报警代码

编辑 `data/alarm.json`，按下面格式新增一条：

```json
{
  "code": "ALM-NEW-001",
  "name": "报警名称",
  "reason": "报警原因",
  "solution": "解决方法"
}
```

## 更新故障案例

编辑 `data/fault_cases.json`，按下面格式新增一条：

```json
{
  "module": "张力",
  "priority": "高",
  "title": "故障标题",
  "symptom": "故障现象",
  "possible_causes": ["可能原因1", "可能原因2"],
  "actions": ["处理方法1", "处理方法2"],
  "case_note": "现场案例记录"
}
```

## 注意事项

- JSON 最后一条数据后面不要加逗号。
- 图片放到 `images/` 目录，页面或文档中使用相对路径。
- 不要写本机磁盘路径。
- 不要写本地服务地址。
