// slack/api.* だけを対象
const SLACK_API = /https:\/\/[^/]+\.slack\.com\/api\/(reactions\.add|reactions\.remove|chat\.postMessage)/;

/* ---------- 型 ---------- */
interface BaseEntry { loggedAt?: string; }
interface SlackBaseEntry extends BaseEntry { app: 'slack'; ts: string; channelId: string; channelName?: string; }
interface SlackPostEntry extends SlackBaseEntry { kind: 'post'; text: string }
interface SlackReactionEntry extends SlackBaseEntry {
    kind: 'reaction';
    emoji: string;
    type: 'add' | 'remove';
    user?: string;
    text?: string;
}

/* ---------- util ---------- */
function fromBlocks(json: string) {
    try {
        const blocks = JSON.parse(json) as any[];
        return blocks
            .flatMap((b) =>
                b.elements?.flatMap((e: any) =>
                    e.elements
                        ?.filter((x: any) => x.type === 'text')
                        .map((x: any) => x.text)
                )
            )
            .join('');
    } catch {
        return '';
    }
}

// 拡張機能を実行した際、サイドパネルを開く
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error))

/** Open (or create) IndexedDB for logs */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('browser-logs', 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('logs')) {
                db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Save a log entry into IndexedDB */
async function saveLog(entry: SlackPostEntry | SlackReactionEntry) {
    try {
        const db = await openDB();
        const tx = db.transaction('logs', 'readwrite');
        const store = tx.objectStore('logs');
        const toSave = { ...entry, loggedAt: entry.loggedAt ?? new Date().toISOString() };
        store.add(toSave);
        tx.oncomplete = () => {
            console.debug('Log saved:', toSave);
            // Notify sidebar UI of new log
            chrome.runtime.sendMessage({ action: 'LOG_SAVED', entry: toSave });
            db.close();
        };
        tx.onerror = () => {
            console.error('Transaction error:', tx.error);
            db.close();
        };
    } catch (err) {
        console.error('Failed to save log:', err);
    }
}

/** Load all log entries from IndexedDB */
async function loadLogs(): Promise<(SlackPostEntry | SlackReactionEntry)[]> {
    const db = await openDB();
    return new Promise((res, rej) => {
        const tx = db.transaction('logs', 'readonly');
        const store = tx.objectStore('logs');
        const req = store.getAll();
        req.onsuccess = () => { res(req.result as any); db.close(); };
        req.onerror = () => { rej(req.error); db.close(); };
    });
}

// Handle GET_LOGS request from content_script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'GET_LOGS') {
        loadLogs().then(logs => sendResponse({ logs })).catch(() => sendResponse({ logs: [] }));
        return true; // keep channel open for async response
    }
});




/* ---------- main listener ---------- */
chrome.webRequest.onBeforeRequest.addListener(
    details => {
        if (!SLACK_API.test(details.url) || details.method !== 'POST') return;
        const fd = details.requestBody?.formData; if (!fd) return;

        /* ========== 投稿 ========== */
        if (details.url.includes('/api/chat.postMessage')) {
            const entry: SlackPostEntry = {
                app: 'slack', kind: 'post',
                ts: fd.ts?.[0] ?? '',
                channelId: fd.channel?.[0] ?? '',
                text: fd.text?.[0] ?? fromBlocks(fd.blocks?.[0] ?? '')
            };
            chrome.tabs.sendMessage(details.tabId, { action: 'GET_CHANNEL_NAME', channelId: entry.channelId }, res => {
                if (res?.channelName) {
                    entry.channelName = res.channelName;
                }
                saveLog(entry);
            });
            return;
        }

        /* ========== リアクション ========== */
        if (details.url.includes('/api/reactions')) {
            const entry: SlackReactionEntry = {
                app: 'slack', kind: 'reaction',
                ts: fd.timestamp?.[0] ?? '',
                channelId: fd.channel?.[0] ?? '',
                emoji: fd.name?.[0] ?? '',
                type: details.url.endsWith('add') ? 'add' : 'remove'
            };
            chrome.tabs.sendMessage(
                details.tabId,
                { action: 'LOOKUP_MESSAGE', ts: entry.ts, channelId: entry.channelId },
                res => {
                    if (!res) {
                        console.error(`No response received for message lookup. entry: ${JSON.stringify(entry)}`);
                        return;
                    }
                    entry.channelName = res.channelName;
                    entry.text = res.text;
                    entry.user = res.user;
                    //console.debug('[Deubg] log:', entry);
                    saveLog(entry);
                });
        }
    },
    { urls: ['https://*.slack.com/api/*'] },
    ['requestBody']
);

/* ---------- storage stub ---------- */
function log(e: SlackPostEntry | SlackReactionEntry) { console.debug('LOG', e) }

/* console log
client-worker:40 [vite] connecting...
client-worker:55 [vite] connected.
background.ts:24 [AUDIT] https://app.slack.com https://yamasaki-test.slack.com/api/chat.postMessage?_x_id=45a143e3-1746449646.826&_x_csid=0U1Adt6cbNM&slack_route=T04FQAVAVDZ&_x_version_ts=1746440862&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=06&_x_num_retries=0  body: "{"formData":{"_x_app_name":["client"],"_x_mode":["online"],"_x_reason":["webapp_message_send"],"_x_sonic":["true"],"blocks":["[{\"type\":\"rich_text\",\"elements\":[{\"type\":\"rich_text_section\",\"elements\":[{\"type\":\"text\",\"text\":\"あああ\"}]}]}]"],"channel":["C08QLKYPUUW"],"client_context_team_id":["T04FQAVAVDZ"],"client_msg_id":["d2b2a81a-b0e6-449f-b879-3608782af3b2"],"draft_id":["9a4e6628-9451-4e0b-be7d-76213cf7a4c9"],"include_channel_perm_error":["true"],"reply_broadcast":["false"],"thread_ts":["1746323684.612039"],"token":["xoxc-4534369369475-4527884821398-8846748629811-cbb7306fab18160e2532e6acea346d07dc8488c4b5014dccb9027baaedbc6b7e"],"ts":["1746449646.xxxxx7"],"type":["message"],"unfurl":["[]"],"xArgs":["{\"draft_id\":\"9a4e6628-9451-4e0b-be7d-76213cf7a4c9\"}"]}})"
background.ts:24 [AUDIT] https://app.slack.com https://yamasaki-test.slack.com/api/reactions.add?_x_id=45a143e3-1746449665.397&_x_csid=0U1Adt6cbNM&slack_route=T04FQAVAVDZ&_x_version_ts=1746440862&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=06&_x_num_retries=0  body: "{"formData":{"_x_app_name":["client"],"_x_mode":["online"],"_x_reason":["changeReactionFromUserAction"],"_x_sonic":["true"],"channel":["C08QLKYPUUW"],"name":["eyes"],"timestamp":["1746449122.020599"],"token":["xoxc-4534369369475-4527884821398-8846748629811-cbb7306fab18160e2532e6acea346d07dc8488c4b5014dccb9027baaedbc6b7e"]}})"
*/