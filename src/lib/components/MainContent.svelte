<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  interface LogEntry {
    app: string;
    ts: string;
    channelId: string;
    channelName?: string;
    kind: "post" | "reaction";
    text?: string;
    emoji?: string;
    type?: "add" | "remove";
    user?: string;
    loggedAt?: string;
  }

  // Reactive logs array
  let logs = $state<LogEntry[]>([]);

  function addLog(entry: LogEntry) {
    logs = [entry, ...logs];
  }

  const listener = (msg: any) => {
    if (msg.action === "LOG_SAVED" && msg.entry) {
      addLog(msg.entry as LogEntry);
    }
  };
  onMount(() => {
    // Initial load
    chrome.runtime.sendMessage({ action: "GET_LOGS" }, (resp) => {
      if (resp?.logs) {
        logs = resp.logs.sort((a: LogEntry, b: LogEntry) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime());
      }
    });
    chrome.runtime.onMessage.addListener(listener);
  });
  onDestroy(() => {
    chrome.runtime.onMessage.removeListener(listener);
  });
  // Listen for new logs
</script>

<div class="card bg-base-200 shadow-xl w-full h-full overflow-auto">
  <div class="card-body">
    <h2 class="card-title">Audit Logs</h2>
    {#if logs.length === 0}
      <p class="text-sm text-gray-500">No logs found.</p>
    {/if}
    <ul class="list-disc list-inside mt-4">
      {#each logs as log (log.loggedAt + log.ts + log.kind)}
        <li class="mb-4">
          <div class="text-xs text-gray-400 mb-1">
            {new Date(log.loggedAt!).toLocaleString()}
          </div>
          {#if log.kind === "post"}
            <div class="font-medium">
              <span class="text-blue-600">[# {log.channelName}]</span>
              Post: {log.text}
            </div>
          {:else}
            <div class="font-medium">
              <span class="text-green-600">[# {log.channelName}]</span>
              Reaction ({log.type} :{log.emoji})
              {#if log.text}
                : {log.text}
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
</div>
