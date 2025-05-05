const SLACK_API = /https:\/\/[^/]+\.slack\.com\/api\/(reactions\.add|reactions\.remove|chat\.postMessage)/;

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        //console.log('[test]', details.method, details.initiator, details.url);
        //if (!SLACK_API.test(details.url) || details.method !== 'POST' || !details.requestBody?.raw?.length) return;
        if (!SLACK_API.test(details.url) || details.method !== 'POST') return;

        if (details.method !== 'POST' || !details.requestBody) return;

        // 文字列化例（formData 優先, なければ raw をテキストで）
        let bodyText = '';
        if (details.requestBody.formData) {
            const bodyText = new URLSearchParams(
                Object.entries(details.requestBody.formData ?? {})
                    .flatMap(([k, vs]) => vs.map((v) => [k, v] as [string, string]))
            ).toString();
        } else if (details.requestBody.raw?.length) {
            const decoder = new TextDecoder();
            bodyText = decoder.decode(details.requestBody.raw[0].bytes);
        }

        // ここで IndexedDB 等に保存
        console.log('[AUDIT]', details.initiator, details.url, ` body: "${JSON.stringify(details.requestBody)})"`);
    },
    { urls: ["<all_urls>"] },
    ["requestBody"]                         // ★これを忘れない
);

/* console log
client-worker:40 [vite] connecting...
client-worker:55 [vite] connected.
background.ts:24 [AUDIT] https://app.slack.com https://yamasaki-test.slack.com/api/chat.postMessage?_x_id=45a143e3-1746449646.826&_x_csid=0U1Adt6cbNM&slack_route=T04FQAVAVDZ&_x_version_ts=1746440862&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=06&_x_num_retries=0  body: "{"formData":{"_x_app_name":["client"],"_x_mode":["online"],"_x_reason":["webapp_message_send"],"_x_sonic":["true"],"blocks":["[{\"type\":\"rich_text\",\"elements\":[{\"type\":\"rich_text_section\",\"elements\":[{\"type\":\"text\",\"text\":\"あああ\"}]}]}]"],"channel":["C08QLKYPUUW"],"client_context_team_id":["T04FQAVAVDZ"],"client_msg_id":["d2b2a81a-b0e6-449f-b879-3608782af3b2"],"draft_id":["9a4e6628-9451-4e0b-be7d-76213cf7a4c9"],"include_channel_perm_error":["true"],"reply_broadcast":["false"],"thread_ts":["1746323684.612039"],"token":["xoxc-4534369369475-4527884821398-8846748629811-cbb7306fab18160e2532e6acea346d07dc8488c4b5014dccb9027baaedbc6b7e"],"ts":["1746449646.xxxxx7"],"type":["message"],"unfurl":["[]"],"xArgs":["{\"draft_id\":\"9a4e6628-9451-4e0b-be7d-76213cf7a4c9\"}"]}})"
background.ts:24 [AUDIT] https://app.slack.com https://yamasaki-test.slack.com/api/reactions.add?_x_id=45a143e3-1746449665.397&_x_csid=0U1Adt6cbNM&slack_route=T04FQAVAVDZ&_x_version_ts=1746440862&_x_frontend_build_type=current&_x_desktop_ia=4&_x_gantry=true&fp=06&_x_num_retries=0  body: "{"formData":{"_x_app_name":["client"],"_x_mode":["online"],"_x_reason":["changeReactionFromUserAction"],"_x_sonic":["true"],"channel":["C08QLKYPUUW"],"name":["eyes"],"timestamp":["1746449122.020599"],"token":["xoxc-4534369369475-4527884821398-8846748629811-cbb7306fab18160e2532e6acea346d07dc8488c4b5014dccb9027baaedbc6b7e"]}})"
*/