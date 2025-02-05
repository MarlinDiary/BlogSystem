<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  // 配置参数
  export let maxTilt = 10;      // 最大倾斜角度
  export let lerpSpeed = 0.15;  // 插值速度
  export let perspective = 600; // 透视距离
  export let scale = 1.05;     // 悬浮时的缩放比例
  export let disabled = false;  // 是否禁用效果

  let cardRef: HTMLElement;
  let tiltX = 0, tiltY = 0;    // 当前倾斜角度
  let targetX = 0, targetY = 0; // 目标倾斜角度
  let rafId: number;
  let isHovered = false;

  // 计算鼠标和卡片中心的偏移，得出目标倾斜
  function handleMouseMove(e: MouseEvent) {
    if (!cardRef || disabled) return;
    
    const rect = cardRef.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = e.clientX - centerX;
    const y = e.clientY - centerY;

    targetX = (y / (rect.height / 2)) * maxTilt;
    targetY = -(x / (rect.width / 2)) * maxTilt;
  }

  function handleMouseEnter() {
    if (disabled) return;
    isHovered = true;
  }

  function handleMouseLeave() {
    if (disabled) return;
    isHovered = false;
    targetX = 0;
    targetY = 0;
  }

  // 逐帧平滑插值
  function updateTilt() {
    if (!disabled) {
      tiltX += (targetX - tiltX) * lerpSpeed;
      tiltY += (targetY - tiltY) * lerpSpeed;

      if (cardRef) {
        const transform = 
          'perspective(' + perspective + 'px)' +
          'rotateX(' + tiltX + 'deg)' +
          'rotateY(' + tiltY + 'deg)' +
          'scale(' + (isHovered ? scale : 1) + ')';
        cardRef.style.transform = transform;
      }
    }

    rafId = requestAnimationFrame(updateTilt);
  }

  onMount(() => {
    // 移动端禁用倾斜效果
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      disabled = true;
    }
    rafId = requestAnimationFrame(updateTilt);
  });

  onDestroy(() => {
    if (rafId) cancelAnimationFrame(rafId);
  });
</script>

<div
  bind:this={cardRef}
  role="presentation"
  on:mousemove={handleMouseMove}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  class="
    transition-[transform,opacity] duration-300 ease-out
    [transform-style:preserve-3d]
    will-change-transform
  "
>
  <slot />
</div> 