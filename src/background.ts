// slack/api.* だけを対象
const SLACK_API = /https:\/\/[^/]+\.slack\.com\/api\/(reactions\.add|reactions\.remove|chat\.postMessage)/;

/* ---------- 型 ---------- */
interface BaseEntry { ts: string; channelId: string; channelName?: string }
interface PostEntry extends BaseEntry { kind: 'post'; text: string }
interface ReactionEntry extends BaseEntry { kind: 'reaction'; emoji: string; type: 'add' | 'remove'; user?: string; text?: string }

/* ---------- util ---------- */
function toParams(form: { [k: string]: string[] | undefined }) { const p = new URLSearchParams(); for (const [k, vs] of Object.entries(form)) vs?.forEach(v => p.append(k, v)); return p }
function fromBlocks(json: string) { try { return JSON.parse(json).flatMap((b: any) => b.elements?.flatMap((e: any) => e.elements?.filter((x: any) => x.type === 'text').map((x: any) => x.text))).join('') } catch { return '' } }


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

/* ---------- main listener ---------- */
chrome.webRequest.onBeforeRequest.addListener(
    details => {
        if (!SLACK_API.test(details.url) || details.method !== 'POST') return;
        const fd = details.requestBody?.formData; if (!fd) return;

        /* ========== 投稿 ========== */
        if (details.url.includes('/api/chat.postMessage')) {
            const entry: PostEntry = {
                kind: 'post',
                ts: fd.ts?.[0] ?? '',
                channelId: fd.channel?.[0] ?? '',
                text: fd.text?.[0] ?? fromBlocks(fd.blocks?.[0] ?? '')
            };
            // チャンネル名をページに問い合わせ
            chrome.tabs.sendMessage(details.tabId, { action: 'GET_CHANNEL_NAME', channelId: entry.channelId }, res => {
                if (res?.channelName) entry.channelName = res.channelName;
                log(entry);
            });
            return;
        }

        /* ========== リアクション ========== */
        const entry: ReactionEntry = {
            kind: 'reaction',
            ts: fd.timestamp?.[0] ?? '',
            channelId: fd.channel?.[0] ?? '',
            emoji: fd.name?.[0] ?? '',
            type: details.url.endsWith('add') ? 'add' : 'remove'
        };
        // 一旦保存（チャンネル名/本文は空）
        // log(entry);

        // ①チャンネル名 ②元メッセージ本文＋送信者 を取得
        chrome.tabs.sendMessage(
            details.tabId,
            { action: 'LOOKUP_MESSAGE', ts: entry.ts, channelId: entry.channelId },
            res => {
                if (!res) return;
                entry.channelName = res.channelName;
                entry.text = res.text;
                entry.user = res.user;
                log(entry);         // 上書き or 再保存
            });
    },
    { urls: ['https://*.slack.com/api/*'] },
    ['requestBody']
);

/* ---------- storage stub ---------- */
function log(e: PostEntry | ReactionEntry) { console.debug('LOG', e) }

/* console log
client-worker:40 [vite] connecting...
client-worker:55 [vite] connected.
background.ts:24 [AUDIT] https://app.slack.com https://yamasaki-test.slack.com/api/chat.postMessage?_x_id=45a143e3-1746449646.826&_x_csid=0U1Adt6cbNM&slack_route=T04FQAVAVDZ&_x_version_ts=1746440862&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=06&_x_num_retries=0  body: "{"formData":{"_x_app_name":["client"],"_x_mode":["online"],"_x_reason":["webapp_message_send"],"_x_sonic":["true"],"blocks":["[{\"type\":\"rich_text\",\"elements\":[{\"type\":\"rich_text_section\",\"elements\":[{\"type\":\"text\",\"text\":\"あああ\"}]}]}]"],"channel":["C08QLKYPUUW"],"client_context_team_id":["T04FQAVAVDZ"],"client_msg_id":["d2b2a81a-b0e6-449f-b879-3608782af3b2"],"draft_id":["9a4e6628-9451-4e0b-be7d-76213cf7a4c9"],"include_channel_perm_error":["true"],"reply_broadcast":["false"],"thread_ts":["1746323684.612039"],"token":["xoxc-4534369369475-4527884821398-8846748629811-cbb7306fab18160e2532e6acea346d07dc8488c4b5014dccb9027baaedbc6b7e"],"ts":["1746449646.xxxxx7"],"type":["message"],"unfurl":["[]"],"xArgs":["{\"draft_id\":\"9a4e6628-9451-4e0b-be7d-76213cf7a4c9\"}"]}})"
background.ts:24 [AUDIT] https://app.slack.com https://yamasaki-test.slack.com/api/reactions.add?_x_id=45a143e3-1746449665.397&_x_csid=0U1Adt6cbNM&slack_route=T04FQAVAVDZ&_x_version_ts=1746440862&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=06&_x_num_retries=0  body: "{"formData":{"_x_app_name":["client"],"_x_mode":["online"],"_x_reason":["changeReactionFromUserAction"],"_x_sonic":["true"],"channel":["C08QLKYPUUW"],"name":["eyes"],"timestamp":["1746449122.020599"],"token":["xoxc-4534369369475-4527884821398-8846748629811-cbb7306fab18160e2532e6acea346d07dc8488c4b5014dccb9027baaedbc6b7e"]}})"
*/