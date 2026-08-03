# 光体AI · 后端能力配置说明文档

> 本平台内置 8 个可选后端模块，共 54 个接口、35 张数据表。在「分步引导流程 → ④ 后端模块」中勾选后，配置摘要面板会自动输出对应接口清单与数据表结构。


## 模块：注册登录

账号体系基础：注册、登录、第三方、找回密码、会话管理。

### 接口清单（8）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 邮箱/手机注册，验证码校验 |
| POST | `/api/auth/login` | 账号密码登录，返回 token |
| POST | `/api/auth/logout` | 注销当前会话 |
| POST | `/api/auth/refresh` | 刷新 access token |
| POST | `/api/auth/send-code` | 发送短信/邮件验证码 |
| POST | `/api/auth/reset-password` | 凭验证码重置密码 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/oauth/{provider}` | 第三方登录（微信/Google/GitHub） |

### 数据表结构（4）

- **user**：id, username, email, phone, password_hash, avatar, status, created_at
- **user_oauth**：id, user_id, provider, open_id, union_id, created_at
- **verification_code**：id, target, type, code, expires_at, used, created_at
- **session**：id, user_id, token, refresh_token, ip, expires_at

## 模块：权限与会员

角色权限控制（RBAC）与会员等级体系。

### 接口清单（8）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/roles` | 角色列表 |
| POST | `/api/roles` | 创建角色并绑定权限 |
| PUT | `/api/roles/{id}` | 更新角色权限 |
| GET | `/api/permissions` | 权限点列表 |
| POST | `/api/users/{id}/roles` | 给用户分配角色 |
| GET | `/api/membership/tiers` | 会员等级配置 |
| POST | `/api/membership/upgrade` | 会员升级/续费 |
| GET | `/api/membership/me` | 我的会员状态 |

### 数据表结构（6）

- **role**：id, name, description, created_at
- **permission**：id, code, name, group, description
- **role_permission**：id, role_id, permission_id
- **user_role**：id, user_id, role_id
- **membership_tier**：id, name, level, price, perks_json, duration_days
- **user_membership**：id, user_id, tier_id, start_at, end_at, status

## 模块：积分

积分获取、消耗、等级与兑换。

### 接口清单（6）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/points/balance` | 查询用户积分余额 |
| POST | `/api/points/earn` | 发放积分（行为/任务） |
| POST | `/api/points/spend` | 扣减积分（兑换） |
| GET | `/api/points/history` | 积分流水分页 |
| GET | `/api/points/rules` | 积分规则配置 |
| POST | `/api/points/redeem` | 积分兑换商品/权益 |

### 数据表结构（4）

- **point_account**：id, user_id, balance, total_earned, total_spent
- **point_log**：id, user_id, type, amount, source, ref_id, created_at
- **point_rule**：id, event, amount, daily_limit, enabled
- **point_product**：id, name, cost, stock, status

## 模块：支付

多渠道收款、退款、对账与支付回调。

### 接口清单（6）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/pay/create` | 创建支付订单（微信/支付宝/Stripe） |
| POST | `/api/pay/callback/{channel}` | 支付渠道异步回调 |
| GET | `/api/pay/{id}` | 查询支付状态 |
| POST | `/api/pay/refund` | 发起退款 |
| GET | `/api/pay/methods` | 可用支付方式列表 |
| GET | `/api/pay/reconcile` | 生成对账文件 |

### 数据表结构（4）

- **payment**：id, order_no, user_id, channel, amount, currency, status, paid_at
- **payment_refund**：id, payment_id, amount, reason, status, created_at
- **pay_channel**：id, name, config_json, enabled
- **pay_callback_log**：id, channel, payload, processed, created_at

## 模块：订单

下单、状态流转、物流与售后。

### 接口清单（7）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/orders` | 创建订单 |
| GET | `/api/orders` | 订单列表（分页/筛选） |
| GET | `/api/orders/{id}` | 订单详情 |
| POST | `/api/orders/{id}/cancel` | 取消订单 |
| POST | `/api/orders/{id}/ship` | 发货/填物流 |
| POST | `/api/orders/{id}/refund` | 申请售后/退款 |
| GET | `/api/orders/{id}/logistics` | 物流轨迹 |

### 数据表结构（5）

- **order**：id, order_no, user_id, amount, status, address_json, created_at
- **order_item**：id, order_id, product_id, sku, qty, price
- **order_status_log**：id, order_id, from, to, operator, created_at
- **shipment**：id, order_id, carrier, tracking_no, status, trajectory_json
- **after_sale**：id, order_id, type, reason, status, refund_amount

## 模块：消息通知

站内信、邮件、短信、推送统一编排。

### 接口清单（6）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/notify/send` | 发送通知（多通道） |
| GET | `/api/notify/inbox` | 用户站内信列表 |
| POST | `/api/notify/{id}/read` | 标记已读 |
| GET | `/api/notify/subscriptions` | 用户订阅偏好 |
| POST | `/api/notify/subscriptions` | 更新订阅偏好 |
| POST | `/api/notify/templates` | 通知模板管理 |

### 数据表结构（4）

- **message**：id, user_id, channel, title, body, read, created_at
- **notify_template**：id, code, channel, title_tpl, body_tpl, variables
- **subscription**：id, user_id, event, channel, enabled
- **push_device**：id, user_id, platform, device_token, enabled

## 模块：内容管理后台

文章、页面、媒体、分类的统一后台管理。

### 接口清单（7）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/cms/articles` | 文章列表 |
| POST | `/api/cms/articles` | 创建文章 |
| PUT | `/api/cms/articles/{id}` | 编辑文章 |
| DELETE | `/api/cms/articles/{id}` | 删除/下架 |
| GET | `/api/cms/pages` | 单页管理 |
| POST | `/api/cms/media` | 媒体资源上传 |
| GET | `/api/cms/categories` | 分类树 |

### 数据表结构（4）

- **article**：id, title, slug, body, cover, category_id, author, status, published_at
- **page**：id, title, slug, body, template, status
- **category**：id, name, parent_id, slug, sort
- **media**：id, name, type, url, size, uploaded_by, created_at

## 模块：数据统计

埋点采集、指标看板与导出。

### 接口清单（6）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/track` | 上报埋点事件 |
| GET | `/api/analytics/overview` | 核心指标概览（DAU/留存/转化） |
| GET | `/api/analytics/funnel` | 转化漏斗 |
| GET | `/api/analytics/report` | 自定义报表 |
| POST | `/api/analytics/export` | 导出 CSV/Excel |
| GET | `/api/analytics/realtime` | 实时在线看板 |

### 数据表结构（4）

- **event_log**：id, user_id, event, props_json, page, created_at
- **metric_daily**：id, date, metric, value, dimension
- **report**：id, name, query_json, creator, schedule
- **dashboard**：id, name, widgets_json, owner