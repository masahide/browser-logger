<script lang="ts">
  import { onMount } from "svelte";
  import { theme, initializeTheme } from "./lib/stores/theme";

  import Header from "./lib/components/Header.svelte";
  import MainContent from "./lib/components/MainContent.svelte";

  onMount(initializeTheme);
</script>

<!-- 画面全体を縦レイアウトに -->
<div class="h-screen flex flex-col bg-base-100" data-theme={$theme}>
  <Header />

  <!-- メイン領域 -->
  <main class="flex-1 p-4 overflow-auto">
    <MainContent />
  </main>
</div>
