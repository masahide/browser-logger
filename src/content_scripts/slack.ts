/** チャンネル ID → チャンネル名をサイドバーの要素から取得 */
function channelNameFromId(id: string): string | undefined {
    // 1) ID 属性でサクッと要素を取得
    const el = document.getElementById(id);
    if (el) {
        const name = el.innerText?.trim();
        if (name) {
            return name;
        }
    }
    return ""
}

/* ========== helper: ts → メッセージ要素 ========== */
function findMsgElement(ts: string): HTMLElement | null {
    return document.querySelector(`[data-item-key="${ts}"]`) ||
        document.querySelector(`[data-message-ts="${ts}"]`);
}

/* ========== listener ========== */
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    /* ---- チャンネル名だけ欲しい ---- */
    if (msg.action === 'GET_CHANNEL_NAME') {
        respond({ channelName: channelNameFromId(msg.channelId) });
        return;
    }

    /* ---- メッセージ本文＋チャンネル名 ---- */
    if (msg.action === 'LOOKUP_MESSAGE') {
        const { ts, channelId } = msg;
        const el = findMsgElement(ts);
        const text = el ? (el.querySelector('[data-qa="message-text"]') as HTMLElement)?.innerText ?? '' : '';
        const user = el ? (el.querySelector('[data-qa^="message_sender"]') as HTMLElement)?.innerText ?? '' : '';
        respond({
            channelName: channelNameFromId(channelId),
            text, user
        });
    }
});
