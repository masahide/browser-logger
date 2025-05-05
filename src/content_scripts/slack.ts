chrome.runtime.onMessage.addListener((msg, _sender, sendResp) => {
    if (msg.action !== 'LOOKUP_TS') return;

    const { ts, channel } = msg;               // channel 未使用でも OK
    const el =
        document.querySelector(`[data-message-ts="${ts}"]`) ||
        document.querySelector(`[data-item-key="${ts}"]`);

    if (!el) return;                           // 見付からない場合は黙って返さない

    const text = (el.querySelector('[data-qa="message-text"]') as HTMLElement)?.innerText ?? '';
    const user = (el.querySelector('[data-qa^="message_sender"]') as HTMLElement)?.innerText ?? '';
    console.debug('LOG:', `${text}, ${user}`);               // ← ここを IndexedDB 等に

    chrome.runtime.sendMessage({
        action: 'MSG_INFO',
        info: { kind: 'reaction', ts, channel, text, user }
    });
});
