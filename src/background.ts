// slack/api.* だけを対象
const SLACK_API = /https:\/\/[^/]+\.slack\.com\/api\/(reactions\.add|reactions\.remove|chat\.postMessage)/;

// =============== 型 ===============
interface SlackPostMsg {
    kind: 'post';
    ts: string;           // 1746449646.123456
    channel: string;      // CXXXX
    text: string;         // あああ
}

interface SlackReaction {
    kind: 'reaction';
    ts: string;           // リアクション対象 msg ts
    channel: string;
    emoji: string;        // eyes, +1 …
    type: 'add' | 'remove';
    // text / user は後で content.ts から補完
    text?: string;
    user?: string;
}

/** blocks フィールド(JSON) から素テキストを抽出（単純化版） */
function extractTextFromBlocks(jsonStr: string): string {
    try {
        const blocks = JSON.parse(jsonStr) as any[];
        return blocks.flatMap(b =>
            b.elements?.flatMap((e: any) =>
                e.elements?.filter((x: any) => x.type === 'text').map((x: any) => x.text)
            )
        ).join('');
    } catch { return ''; }
}

// =============== main ===============
chrome.webRequest.onBeforeRequest.addListener(
    details => {
        if (!SLACK_API.test(details.url) || details.method !== 'POST') return;
        // console.debug(`[debug] requestBody: ${JSON.stringify(details.requestBody)}`);
        const fd = details.requestBody?.formData;
        if (!fd) return;                                // ここでは formData 確定

        // ── chat.postMessage ────────────────────────
        if (details.url.includes('/api/chat.postMessage')) {
            const ts = fd.ts?.[0] ?? '';
            const channel = fd.channel?.[0] ?? '';
            const text = fd.text?.[0] ?? extractTextFromBlocks(fd.blocks?.[0] ?? '');

            const payload: SlackPostMsg = { kind: 'post', ts, channel, text };
            log(payload);                         // ★保存
            chrome.tabs.sendMessage(details.tabId, { action: 'LOOKUP_TS', ts, channel })
            return;                               // ここで終わり
        }

        // ── reactions.add / reactions.remove ────────
        const ts = fd.timestamp?.[0] ?? '';
        const channel = fd.channel?.[0] ?? '';
        const emoji = fd.name?.[0] ?? '';
        const type = details.url.endsWith('add') ? 'add' : 'remove';

        const payload: SlackReaction = { kind: 'reaction', ts, channel, emoji, type };
        // まずは暫定保存（user/text は空）
        log(payload);

        // 元メッセージの user/text を取得したい → 表示中タブへ問い合わせ
        chrome.tabs.sendMessage(details.tabId, { action: 'LOOKUP_TS', ts, channel })
    },
    { urls: ['https://*.slack.com/api/*'] },
    ['requestBody']
);

// content.ts からの返信を受取ってログを更新
chrome.runtime.onMessage.addListener((msg, _sender) => {
    if (msg.action !== 'MSG_INFO') return;
    log(msg.info as SlackReaction);            // 上書き保存でも append でもお好みで
});

// =============== storage stub ===============
function log(entry: SlackPostMsg | SlackReaction) {
    console.debug('LOG', entry);               // ← ここを IndexedDB 等に
}

/* console log
client-worker:40 [vite] connecting...
client-worker:55 [vite] connected.
background.ts:24 [AUDIT] https://app.slack.com https://yamasaki-test.slack.com/api/chat.postMessage?_x_id=45a143e3-1746449646.826&_x_csid=0U1Adt6cbNM&slack_route=T04FQAVAVDZ&_x_version_ts=1746440862&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=06&_x_num_retries=0  body: "{"formData":{"_x_app_name":["client"],"_x_mode":["online"],"_x_reason":["webapp_message_send"],"_x_sonic":["true"],"blocks":["[{\"type\":\"rich_text\",\"elements\":[{\"type\":\"rich_text_section\",\"elements\":[{\"type\":\"text\",\"text\":\"あああ\"}]}]}]"],"channel":["C08QLKYPUUW"],"client_context_team_id":["T04FQAVAVDZ"],"client_msg_id":["d2b2a81a-b0e6-449f-b879-3608782af3b2"],"draft_id":["9a4e6628-9451-4e0b-be7d-76213cf7a4c9"],"include_channel_perm_error":["true"],"reply_broadcast":["false"],"thread_ts":["1746323684.612039"],"token":["xoxc-4534369369475-4527884821398-8846748629811-cbb7306fab18160e2532e6acea346d07dc8488c4b5014dccb9027baaedbc6b7e"],"ts":["1746449646.xxxxx7"],"type":["message"],"unfurl":["[]"],"xArgs":["{\"draft_id\":\"9a4e6628-9451-4e0b-be7d-76213cf7a4c9\"}"]}})"
background.ts:24 [AUDIT] https://app.slack.com https://yamasaki-test.slack.com/api/reactions.add?_x_id=45a143e3-1746449665.397&_x_csid=0U1Adt6cbNM&slack_route=T04FQAVAVDZ&_x_version_ts=1746440862&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=06&_x_num_retries=0  body: "{"formData":{"_x_app_name":["client"],"_x_mode":["online"],"_x_reason":["changeReactionFromUserAction"],"_x_sonic":["true"],"channel":["C08QLKYPUUW"],"name":["eyes"],"timestamp":["1746449122.020599"],"token":["xoxc-4534369369475-4527884821398-8846748629811-cbb7306fab18160e2532e6acea346d07dc8488c4b5014dccb9027baaedbc6b7e"]}})"
*/