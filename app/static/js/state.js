// 共享状态
export let isGenerating = false;
export let controller = null;

// 状态更新函数
export function setGenerating(value) {
    isGenerating = value;
}

export function setController(value) {
    controller = value;
} 