# -*- coding: utf-8 -*-
import json
OUT = "C:/Users/AW/WorkBuddy/2026-07-30-21-07-56/guangti-platform/backend.json"

MODULES = [
{
 "id":"auth","name":"注册登录","icon":"🔐",
 "desc":"账号体系基础：注册、登录、第三方、找回密码、会话管理。",
 "apis":[
  {"method":"POST","path":"/api/auth/register","desc":"邮箱/手机注册，验证码校验"},
  {"method":"POST","path":"/api/auth/login","desc":"账号密码登录，返回 token"},
  {"method":"POST","path":"/api/auth/logout","desc":"注销当前会话"},
  {"method":"POST","path":"/api/auth/refresh","desc":"刷新 access token"},
  {"method":"POST","path":"/api/auth/send-code","desc":"发送短信/邮件验证码"},
  {"method":"POST","path":"/api/auth/reset-password","desc":"凭验证码重置密码"},
  {"method":"GET","path":"/api/auth/me","desc":"获取当前用户信息"},
  {"method":"POST","path":"/api/auth/oauth/{provider}","desc":"第三方登录（微信/Google/GitHub）"},
 ],
 "tables":[
  {"name":"user","fields":"id, username, email, phone, password_hash, avatar, status, created_at"},
  {"name":"user_oauth","fields":"id, user_id, provider, open_id, union_id, created_at"},
  {"name":"verification_code","fields":"id, target, type, code, expires_at, used, created_at"},
  {"name":"session","fields":"id, user_id, token, refresh_token, ip, expires_at"},
 ],
},
{
 "id":"rbac","name":"权限与会员","icon":"🛡️",
 "desc":"角色权限控制（RBAC）与会员等级体系。",
 "apis":[
  {"method":"GET","path":"/api/roles","desc":"角色列表"},
  {"method":"POST","path":"/api/roles","desc":"创建角色并绑定权限"},
  {"method":"PUT","path":"/api/roles/{id}","desc":"更新角色权限"},
  {"method":"GET","path":"/api/permissions","desc":"权限点列表"},
  {"method":"POST","path":"/api/users/{id}/roles","desc":"给用户分配角色"},
  {"method":"GET","path":"/api/membership/tiers","desc":"会员等级配置"},
  {"method":"POST","path":"/api/membership/upgrade","desc":"会员升级/续费"},
  {"method":"GET","path":"/api/membership/me","desc":"我的会员状态"},
 ],
 "tables":[
  {"name":"role","fields":"id, name, description, created_at"},
  {"name":"permission","fields":"id, code, name, group, description"},
  {"name":"role_permission","fields":"id, role_id, permission_id"},
  {"name":"user_role","fields":"id, user_id, role_id"},
  {"name":"membership_tier","fields":"id, name, level, price, perks_json, duration_days"},
  {"name":"user_membership","fields":"id, user_id, tier_id, start_at, end_at, status"},
 ],
},
{
 "id":"points","name":"积分","icon":"⭐",
 "desc":"积分获取、消耗、等级与兑换。",
 "apis":[
  {"method":"GET","path":"/api/points/balance","desc":"查询用户积分余额"},
  {"method":"POST","path":"/api/points/earn","desc":"发放积分（行为/任务）"},
  {"method":"POST","path":"/api/points/spend","desc":"扣减积分（兑换）"},
  {"method":"GET","path":"/api/points/history","desc":"积分流水分页"},
  {"method":"GET","path":"/api/points/rules","desc":"积分规则配置"},
  {"method":"POST","path":"/api/points/redeem","desc":"积分兑换商品/权益"},
 ],
 "tables":[
  {"name":"point_account","fields":"id, user_id, balance, total_earned, total_spent"},
  {"name":"point_log","fields":"id, user_id, type, amount, source, ref_id, created_at"},
  {"name":"point_rule","fields":"id, event, amount, daily_limit, enabled"},
  {"name":"point_product","fields":"id, name, cost, stock, status"},
 ],
},
{
 "id":"payment","name":"支付","icon":"💳",
 "desc":"多渠道收款、退款、对账与支付回调。",
 "apis":[
  {"method":"POST","path":"/api/pay/create","desc":"创建支付订单（微信/支付宝/Stripe）"},
  {"method":"POST","path":"/api/pay/callback/{channel}","desc":"支付渠道异步回调"},
  {"method":"GET","path":"/api/pay/{id}","desc":"查询支付状态"},
  {"method":"POST","path":"/api/pay/refund","desc":"发起退款"},
  {"method":"GET","path":"/api/pay/methods","desc":"可用支付方式列表"},
  {"method":"GET","path":"/api/pay/reconcile","desc":"生成对账文件"},
 ],
 "tables":[
  {"name":"payment","fields":"id, order_no, user_id, channel, amount, currency, status, paid_at"},
  {"name":"payment_refund","fields":"id, payment_id, amount, reason, status, created_at"},
  {"name":"pay_channel","fields":"id, name, config_json, enabled"},
  {"name":"pay_callback_log","fields":"id, channel, payload, processed, created_at"},
 ],
},
{
 "id":"order","name":"订单","icon":"🧾",
 "desc":"下单、状态流转、物流与售后。",
 "apis":[
  {"method":"POST","path":"/api/orders","desc":"创建订单"},
  {"method":"GET","path":"/api/orders","desc":"订单列表（分页/筛选）"},
  {"method":"GET","path":"/api/orders/{id}","desc":"订单详情"},
  {"method":"POST","path":"/api/orders/{id}/cancel","desc":"取消订单"},
  {"method":"POST","path":"/api/orders/{id}/ship","desc":"发货/填物流"},
  {"method":"POST","path":"/api/orders/{id}/refund","desc":"申请售后/退款"},
  {"method":"GET","path":"/api/orders/{id}/logistics","desc":"物流轨迹"},
 ],
 "tables":[
  {"name":"order","fields":"id, order_no, user_id, amount, status, address_json, created_at"},
  {"name":"order_item","fields":"id, order_id, product_id, sku, qty, price"},
  {"name":"order_status_log","fields":"id, order_id, from, to, operator, created_at"},
  {"name":"shipment","fields":"id, order_id, carrier, tracking_no, status, trajectory_json"},
  {"name":"after_sale","fields":"id, order_id, type, reason, status, refund_amount"},
 ],
},
{
 "id":"notification","name":"消息通知","icon":"🔔",
 "desc":"站内信、邮件、短信、推送统一编排。",
 "apis":[
  {"method":"POST","path":"/api/notify/send","desc":"发送通知（多通道）"},
  {"method":"GET","path":"/api/notify/inbox","desc":"用户站内信列表"},
  {"method":"POST","path":"/api/notify/{id}/read","desc":"标记已读"},
  {"method":"GET","path":"/api/notify/subscriptions","desc":"用户订阅偏好"},
  {"method":"POST","path":"/api/notify/subscriptions","desc":"更新订阅偏好"},
  {"method":"POST","path":"/api/notify/templates","desc":"通知模板管理"},
 ],
 "tables":[
  {"name":"message","fields":"id, user_id, channel, title, body, read, created_at"},
  {"name":"notify_template","fields":"id, code, channel, title_tpl, body_tpl, variables"},
  {"name":"subscription","fields":"id, user_id, event, channel, enabled"},
  {"name":"push_device","fields":"id, user_id, platform, device_token, enabled"},
 ],
},
{
 "id":"cms","name":"内容管理后台","icon":"🗂️",
 "desc":"文章、页面、媒体、分类的统一后台管理。",
 "apis":[
  {"method":"GET","path":"/api/cms/articles","desc":"文章列表"},
  {"method":"POST","path":"/api/cms/articles","desc":"创建文章"},
  {"method":"PUT","path":"/api/cms/articles/{id}","desc":"编辑文章"},
  {"method":"DELETE","path":"/api/cms/articles/{id}","desc":"删除/下架"},
  {"method":"GET","path":"/api/cms/pages","desc":"单页管理"},
  {"method":"POST","path":"/api/cms/media","desc":"媒体资源上传"},
  {"method":"GET","path":"/api/cms/categories","desc":"分类树"},
 ],
 "tables":[
  {"name":"article","fields":"id, title, slug, body, cover, category_id, author, status, published_at"},
  {"name":"page","fields":"id, title, slug, body, template, status"},
  {"name":"category","fields":"id, name, parent_id, slug, sort"},
  {"name":"media","fields":"id, name, type, url, size, uploaded_by, created_at"},
 ],
},
{
 "id":"analytics","name":"数据统计","icon":"📊",
 "desc":"埋点采集、指标看板与导出。",
 "apis":[
  {"method":"POST","path":"/api/track","desc":"上报埋点事件"},
  {"method":"GET","path":"/api/analytics/overview","desc":"核心指标概览（DAU/留存/转化）"},
  {"method":"GET","path":"/api/analytics/funnel","desc":"转化漏斗"},
  {"method":"GET","path":"/api/analytics/report","desc":"自定义报表"},
  {"method":"POST","path":"/api/analytics/export","desc":"导出 CSV/Excel"},
  {"method":"GET","path":"/api/analytics/realtime","desc":"实时在线看板"},
 ],
 "tables":[
  {"name":"event_log","fields":"id, user_id, event, props_json, page, created_at"},
  {"name":"metric_daily","fields":"id, date, metric, value, dimension"},
  {"name":"report","fields":"id, name, query_json, creator, schedule"},
  {"name":"dashboard","fields":"id, name, widgets_json, owner"},
 ],
},
]

with open(OUT,"w",encoding="utf-8") as f:
    json.dump(MODULES,f,ensure_ascii=False,indent=1)

print("后端模块数:",len(MODULES))
for m in MODULES:
    print(f"  - {m['name']}: {len(m['apis'])} 接口, {len(m['tables'])} 表")
