<script lang="ts">
  import ReactionIcon from './ReactionIcon.svelte';

  export let articleId: number;
  export let reactions = {
    claps: 0,
    heart: 0,
    'thumbs-up': 0,
    fire: 0
  };
  export let isScrolled = false;

  type ReactionType = 'claps' | 'heart' | 'thumbs-up' | 'fire';
  const reactionTypes: ReactionType[] = ['claps', 'heart', 'thumbs-up', 'fire'];

  let reacted = {
    claps: false,
    heart: false,
    'thumbs-up': false,
    fire: false
  };

  // 处理反应
  async function handleReaction(type: ReactionType) {
    if (reacted[type]) return;
    
    reacted[type] = true;
    reactions[type] += 1;
    
    try {
      await fetch(`/api/articles/${articleId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });
    } catch (err) {
      console.error('反应失败:', err);
      reacted[type] = false;
      reactions[type] -= 1;
    }
  }
</script>

<style lang="postcss">
  .reactions {
    position: absolute;
    width: 48px;
    height: fit-content;
    display: none;
    z-index: 100;
    transition: all 0.3s ease;
    @screen lg {
      display: block;
      position: fixed;
      left: 50%;
      transform: translateX(calc(50% + 440px));
      margin-right: -40px;
    }

    &[data-scrolled="true"] {
      top: 2rem;
      padding-top: 5rem;
    }

    &:not([data-scrolled="true"]) {
      top: 16rem;
    }
  }

  .reactions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
    align-items: center;
  }

  .reactions-container {
    background-image: linear-gradient(to bottom, rgb(244 244 245 / 0.8), rgb(255 255 255 / 0.9));
    border-radius: 1.5rem;
    backdrop-filter: blur(8px);
    padding-bottom: 0.5rem;
    @apply ring-1 ring-zinc-400/10;
    :global(.dark) & {
      background-image: linear-gradient(to bottom, rgb(39 39 42 / 0.8), rgb(24 24 27 / 0.8));
      @apply ring-1 ring-white/10;
    }
  }

  @media (max-width: 1280px) {
    .reactions {
      display: none;
    }
  }
</style>

<div
  role="toolbar"
  aria-label="文章反应"
  class="reactions"
  data-scrolled={isScrolled}
>
  <div class="reactions-container">
    <div class="reactions-list">
      {#each reactionTypes as type}
        <ReactionIcon
          {type}
          count={reactions[type]}
          on:react={() => handleReaction(type)}
        />
      {/each}
    </div>
  </div>
</div> 