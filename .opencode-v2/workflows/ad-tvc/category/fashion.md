# Category：服装

> 经 `category/index.md` 命中后才读。视觉调研只看 `creative-research` 节，进入具体 Stage 后只看该 Stage 的节。

## `creative-research`

### 补充事实

- 搞清楚是什么单品、确切是什么颜色、什么料子、怎么剪裁、有哪些做工亮点，以及片中人是在什么场合穿它。
- 用固定模特时，记下这个人是谁、衣服穿在身上是合身还是宽松、哪些造型细节要一直保持。
- 用户提供了品牌字体、标准色或标志文件，就登记来源和能用在哪，给全片字体包和结尾定版用；没有的话由锚点阶段按 Style Master 推一套字形方向，别编一个不存在的品牌字体名。

### 参考与输出

- 整套穿搭、面料近景、动起来的样子，按路线真正要用的去准备，没有数量指标。
- 面料动态参考只用来学它怎么飘、怎么拉伸、怎么垂、怎么反光，不照搬参考里的人和场景。
- `category_profile` 里放：面料对光的反应、衣服动起来的规律、整套造型、人和场景的关系。

## `anchors`

- 路线围绕三件事展开：穿的人处在什么状态、面料怎么动、场景说明了什么身份。风格听 Style Master 的，不默认套“奢侈大片”或“街头潮牌”模板。

## `storyboard`

分镜阶段把本节中适用的条目写成稳定标量，挂到对应单元扁平的 `constraints[kind=tvc_storyboard_plan_unit].execution_delta` 下。本节只冻结 Prompt 输入和执行增量，不写视频 work item；`prompt` 由视频生成阶段的 Planner 写，视频生成只认 capsule，不会再翻本卡。
只用 `fashion.prompt_rules`、`fashion.ref_routing`、`fashion.result_qc_boundary` 这三个 key，只写本单元用得上的短标量，不另开 `quality_checks`。

### Prompt 输入增量

- 用光贴合料子：丝绒吃光、光线柔散；真丝和缎子靠侧逆光出光泽；皮革压住高光别过曝；蕾丝和薄纱要透出层次。
- 走路、回身、被风吹、奔跑跳跃、换衣服时，写清面料往哪飘、多快、最后怎么落定。
- 要看整套搭配就给到全身、比例准确；要看做工再推近，不规定景别占比。
- 有固定模特时，人、衣服的状态、所处场景都要前后一致。

### 参考与检查

- 特殊面料、整套造型或需要认人的镜头，挑对应 refs 带上。
- `fashion.result_qc_boundary` 包含 `fabric_rendering`、`garment_color`、`full_look`、`model_identity`、`setting_match`。
