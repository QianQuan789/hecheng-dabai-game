# 音效资源目录

把音效放在这个文件夹里，并使用以下文件名：

```text
drop.mp3
merge.m4a
bonus.mp3
game-over.mp3
bgm.m4a
```

| 文件名 | 播放时机 |
|---|---|
| `drop.mp3` | 投放角色 |
| `merge.m4a` | 合成成功（当前为「冰冰冰」音效） |
| `bonus.mp3` | 两个最高级角色消除 |
| `game-over.mp3` | 游戏结束 |
| `bgm.m4a` | 背景音乐（循环播放，当前为「《東南苦行山》×2倍速」） |

缺失的文件会自动由游戏内置的 Web Audio 提示音替代；背景音乐缺失时则直接静音跳过。

注意：`merge.m4a` 与 `bgm.m4a` 的实际编码为 AAC（MP4 容器），请使用 `.m4a` 后缀以获得正确的 Content-Type。
