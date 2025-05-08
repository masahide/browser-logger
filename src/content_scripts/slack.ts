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
    // ① 通常ビュー
    const exact = document.querySelector<HTMLElement>(
        `[data-item-key="${ts}"], [data-message-ts="${ts}"]`
    );
    if (exact) return exact;

    // ② 未読ビュー  ── message-<channel>-<ts> / unreads_view_message-<...>-<ts>
    return (
        document.querySelector<HTMLElement>(`[data-item-key$="-${ts}"]`) ||
        document.querySelector<HTMLElement>(`[id$="-${ts}"]`)
    );
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
        let text = '';
        let user = '';

        if (el) {
            // 本文
            text =
                el.querySelector<HTMLElement>('[data-qa="message-text"]')?.innerText.trim() ||
                el.querySelector<HTMLElement>('.p-rich_text_section')?.innerText.trim() ||
                '';

            // 送信者
            const userBtn =
                el.querySelector<HTMLElement>('button[data-message-sender]') ||      // これが本命
                el.querySelector<HTMLElement>('[data-qa="message_sender_name"]');    // 旧 UI 互換

            if (userBtn) {
                // まれに改行で重複する保険：最初の行だけ使う
                user = userBtn.innerText.split(/\n/)[0].trim();
            } else {
                user = '';
            }
        }
        respond({ channelName: channelNameFromId(channelId), text, user });
    }
});
