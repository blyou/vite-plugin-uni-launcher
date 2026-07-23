import { alipayAdapter } from './alipay'
import { douyinAdapter } from './douyin'
import { wechatAdapter } from './wechat'

export const presets = [wechatAdapter, alipayAdapter, douyinAdapter]
