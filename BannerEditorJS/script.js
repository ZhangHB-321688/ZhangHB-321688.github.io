import { MultipleLayers, preloadImages, convertToMinecraftCommand } from './functions.js';
import { COLORS } from './colors.js';

const allPatternImages = [
    'bo.png',
    'mc.png', 'cr.png', 'cbo.png', 'lud.png', 'rd.png', 'ld.png', 'rud.png', 'gra.png',
    'gru.png', 'hh.png', 'hhb.png', 'vh.png', 'vhr.png', 'mr.png', 'ss.png', 'bl.png',
    'br.png', 'tl.png', 'tr.png', 'sc.png', 'bs.png', 'cs.png', 'dls.png', 'drs.png',
    'ls.png', 'ms.png', 'rs.png', 'ts.png', 'bt.png', 'tt.png', 'bts.png', 'tts.png',
    'bri.png', 'cre.png', 'sku.png', 'flo.png', 'moj.png', 'glb.png', 'pig.png', 'flw.png',
    'gus.png'
];
// 配置和常量
const CONFIG = {
    images: {
        default: './ToBeEdit.png',
        error: './Failed.png'
    }
    // 移除了存储相关配置
};

// 全局变量
let blockCount = 0;
let container;
let currentEditingBlock = null;
let selectedColor = 'F'; // 默认选择黑色
let isEditingBackground = false; // 是否处于编辑背景颜色模式
let lastBackgroundColor = 'F'; // 记住上次编辑背景颜色时选定的颜色
let isDragging = false; // 全局拖拽状态
let currentDraggingBlock = null; // 当前正在拖拽的方块

/**
 * 初始化应用
 */
async function initApp() {
    // 预加载所有图片
    try {
        await preloadImages(allPatternImages);
        console.log('All pattern images preloaded successfully!');
    } catch (error) {
        console.error('Failed to preload images:', error);
    }
    
    // 创建容器
    setupContainer();
    
    // 初始化图形化编辑器
    initGraphicalEditor();
    
    // 设置事件监听（在编辑器初始化后）
    setupEventListeners();
    
    // 初始化按钮状态
    updateButtonStates();
}

/**
 * 创建并设置容器
 */
function setupContainer() {
    container = document.createElement('div');
    container.id = 'draggable-container';
    container.style.position = 'absolute';
    container.style.width = '100%';
    container.style.height = '100%';
    document.body.appendChild(container);
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 获取添加方块按钮
    const addBlockBtn = document.getElementById('addBlockBtn');
    
    // 功能按钮事件监听
    const menuButton = document.getElementById('menuButton');
    const menuDropdown = document.getElementById('menuDropdown');
    
    if (menuButton && menuDropdown) {
        // 点击按钮切换菜单显示
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = menuDropdown.style.display !== 'none';
            menuDropdown.style.display = isVisible ? 'none' : 'block';
        });
        
        // 点击菜单项
        menuDropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('menu-item')) {
                const itemId = e.target.id;
                menuDropdown.style.display = 'none';
                
                switch(itemId) {
                    case 'copyFlagItem':
                        copySelectedFlag();
                        break;
                    case 'exportFlagItem':
                        exportSelectedFlagToClipboard();
                        break;
                    case 'importFlagItem':
                        importFlagFromClipboard();
                        break;
                    case 'exportPanelItem':
                        exportPanelToClipboard();
                        break;
                    case 'importPanelItem':
                        importPanelFromClipboard();
                        break;
                    case 'generateMinecraftItem':
                        generateMinecraftCommand();
                        break;
                    case 'exportToShulkerBoxItem':
                        exportToShulkerBox();
                        break;
                    case 'clearScreenItem':
                        showConfirmDialog('清屏确认', '确定要清除所有旗帜吗？此操作不可撤销。', clearAllFlags);
                        break;
                }
            }
        });
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', () => {
            menuDropdown.style.display = 'none';
        });
    }
    
    // 添加方块按钮
    addBlockBtn.addEventListener('click', () => {
        const newBlock = createDraggableBlock();
        // 移除之前方块的编辑状态
        document.querySelectorAll('.draggable.editing').forEach(block => {
            block.classList.remove('editing');
        });
        // 设置新方块为当前编辑方块
        setCurrentEditingBlock(newBlock);
        newBlock.classList.add('editing');
    });
    
    // 点击空白区域取消选中
    document.addEventListener('click', (e) => {
        // 检查点击的是否是方块、编辑器或其子元素
        const clickedBlock = e.target.closest('.draggable');
        const clickedEditor = e.target.closest('.graphical-editor');
        
        // 如果点击的不是方块也不是编辑器，则取消选中
        if (!clickedBlock && !clickedEditor) {
            document.querySelectorAll('.draggable.editing').forEach(block => {
                block.classList.remove('editing');
            });
            currentEditingBlock = null;
            updatePatternDisplay(); // 更新图案显示
            updateButtonStates(); // 更新按钮状态
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp);

/**
 * 创建可拖动方块
 */
function createDraggableBlock() {
    blockCount++;
    const draggableBlock = createBlockElement();
    const blockImage = createBlockImage(draggableBlock);
    
    // 将方块添加到容器
    container.appendChild(draggableBlock);
    
    // 设置拖动相关变量 - 在方块添加到DOM后计算，确保offsetWidth正确
    const gridSize = Math.floor(draggableBlock.offsetWidth * 1.15); // 网格宽度是方块width*1.15向下取整
    
    // 添加事件监听器
    setupBlockEventListeners(draggableBlock, blockImage, gridSize);
    
    return draggableBlock;
}

/**
 * 创建方块元素
 */
function createBlockElement() {
    const draggableBlock = document.createElement('div');
    draggableBlock.className = 'draggable';
    draggableBlock.id = `draggableBlock${blockCount}`;
    // 初始化为包含base元素，使用上次选择的背景颜色
    draggableBlock.dataset.multipleLayers = `${lastBackgroundColor}base`;
    
    // 临时添加到DOM以获取正确的尺寸
    draggableBlock.style.visibility = 'hidden';
    container.appendChild(draggableBlock);
    
    // 计算网格大小
    const gridSize = Math.floor(draggableBlock.offsetWidth * 1.15);
    
    // 设置初始位置，所有旗帜都在同一位置，向下一格避免与顶部菜单重叠
    const baseLeft = 0;
    const baseTop = gridSize; // 向下一个网格单位，避免与顶部菜单重叠
    
    // 确保对齐到网格（左上角就是网格起点，所以直接使用计算的位置）
    const alignedLeft = baseLeft;
    const alignedTop = baseTop;
    
    draggableBlock.style.left = `${alignedLeft}px`;
    draggableBlock.style.top = `${alignedTop}px`;
    draggableBlock.style.zIndex = '10010'; // 确保新旗帜显示在菜单上方
    draggableBlock.style.visibility = 'visible';
    
    // 从DOM中移除，稍后会重新添加
    container.removeChild(draggableBlock);
    
    return draggableBlock;
}

/**
 * 创建方块图像
 */
function createBlockImage(draggableBlock) {
    const blockImage = document.createElement('img');
    blockImage.className = 'block-image';
    blockImage.draggable = false;
    draggableBlock.appendChild(blockImage);
    
    // 设置图像更新逻辑
    setupImageUpdater(draggableBlock, blockImage);
    
    return blockImage;
}

/**
 * 设置图像更新器
 */
function setupImageUpdater(draggableBlock, blockImage) {
    // 更新图像的函数
    async function updateBlockImage() {
        const multipleLayersValue = draggableBlock.dataset.multipleLayers;
        if (multipleLayersValue) {
            try {
                const imageBitmap = await MultipleLayers(multipleLayersValue);

                // 创建临时画布绘制ImageBitmap
                const canvas = document.createElement('canvas');
                canvas.width = imageBitmap.width;
                canvas.height = imageBitmap.height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(imageBitmap, 0, 0);

                // 将画布内容转换为Blob然后转为URL
                canvas.toBlob(blob => {
                    if (blockImage.src) {
                        URL.revokeObjectURL(blockImage.src);
                    }
                    blockImage.src = URL.createObjectURL(blob);
                });
            } catch (error) {
                console.error('Error generating image:', error);
                blockImage.src = 'Failed.png'; // 错误时清除图像
                blockImage.alt = '生成失败 failed'; // 添加错误的alt文本
            }
        } else {
            blockImage.src = './ToBeEdit.png'; // 如果没有值则清除图像
            blockImage.alt = '点击编辑 click to edit';
        }
    }

    // 当data-multiple-layers属性变化时更新图像
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-multiple-layers') {
                updateBlockImage();
            }
        });
    });
    observer.observe(draggableBlock, { attributes: true });

    // 初始图像显示
    updateBlockImage();
}

/**
 * 设置方块的事件监听器
 */
function setupBlockEventListeners(draggableBlock, blockImage, gridSize) {
    // 在闭包内部定义拖动相关变量，确保每个方块有自己的状态
    let isClick = true; // 区分点击和拖动的标志
    let offsetX = 0, offsetY = 0;
    let startX = 0, startY = 0; // 存储初始触摸/鼠标位置
    
    // 开始拖动
    draggableBlock.addEventListener('mousedown', e => {
        // 如果已经有其他方块在拖拽，不允许开始新的拖拽
        if (currentDraggingBlock && currentDraggingBlock !== draggableBlock) {
            return;
        }
        
        isDragging = true;
        currentDraggingBlock = draggableBlock;
        const coords = getCoords(e);
        startX = coords.x;
        startY = coords.y;
        offsetX = coords.x - draggableBlock.getBoundingClientRect().left;
        offsetY = coords.y - draggableBlock.getBoundingClientRect().top;
        draggableBlock.style.cursor = 'grabbing';
        draggableBlock.style.zIndex = '20000'; // 拖动时设置最高z-index

        // 添加移动和停止事件监听器
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false });
        document.addEventListener('mouseup', stopHandler);
        document.addEventListener('touchend', stopHandler);
        document.addEventListener('mouseleave', stopHandler);
        document.addEventListener('touchcancel', stopHandler);

        // 仅对touchstart阻止默认行为以避免滚动，但允许点击
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
    });
    draggableBlock.addEventListener('touchstart', e => {
        // 如果已经有其他方块在拖拽，不允许开始新的拖拽
        if (currentDraggingBlock && currentDraggingBlock !== draggableBlock) {
            return;
        }
        
        isDragging = true;
        currentDraggingBlock = draggableBlock;
        const coords = getCoords(e);
        startX = coords.x;
        startY = coords.y;
        offsetX = coords.x - draggableBlock.getBoundingClientRect().left;
        offsetY = coords.y - draggableBlock.getBoundingClientRect().top;
        draggableBlock.style.cursor = 'grabbing';
        draggableBlock.style.zIndex = '20000'; // 拖动时设置最高z-index

        // 添加移动和停止事件监听器
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false });
        document.addEventListener('mouseup', stopHandler);
        document.addEventListener('touchend', stopHandler);
        document.addEventListener('mouseleave', stopHandler);
        document.addEventListener('touchcancel', stopHandler);

        // 仅对touchstart阻止默认行为以避免滚动，但允许点击
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
    });

    // 添加上下文菜单事件监听器（移动端触摸，PC端点击）
    draggableBlock.addEventListener('touchend', e => {
        if (isClick) {
            handleBlockInteraction(e, draggableBlock);
        }
    });
    draggableBlock.addEventListener('click', e => {
        if (isClick) {
            handleBlockInteraction(e, draggableBlock);
        }
    });

    // 拖动
    const moveHandler = e => {
        if (!isDragging || currentDraggingBlock !== draggableBlock) return;
        const coords = getCoords(e);

        // If moved significantly, it's a drag, not a click
        const deltaX = Math.abs(coords.x - startX);
        const deltaY = Math.abs(coords.y - startY);
        if (deltaX > 5 || deltaY > 5) { // Threshold for distinguishing click from drag
            isClick = false;
        }

        // 计算新位置
        let newX = coords.x - offsetX;
        let newY = coords.y - offsetY;
        
        // 获取容器和方块的尺寸信息
        const containerRect = container.getBoundingClientRect();
        const blockWidth = draggableBlock.offsetWidth;
        const blockHeight = draggableBlock.offsetHeight;
        
        // 边界检查 - 确保方块不会超出容器边界
        const minX = 0;
        const minY = 0;
        const maxX = containerRect.width - blockWidth;
        const maxY = containerRect.height - blockHeight;
        
        // 限制在边界内
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
        
        // 在拖动过程中就对齐到网格
        if (gridSize > 0) {
            // 对齐到网格
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
            
            // 再次检查网格对齐后是否超出边界
            newX = Math.max(minX, Math.min(maxX, newX));
            newY = Math.max(minY, Math.min(maxY, newY));
        }

        draggableBlock.style.left = `${newX}px`;
        draggableBlock.style.top = `${newY}px`;
        
        // 防止触摸事件导致页面滚动
        if (e.type === 'touchmove') {
            e.preventDefault();
        }
    };

    // 停止拖动并对齐到网格坐标
    const stopHandler = () => {
        if (!isDragging || currentDraggingBlock !== draggableBlock) return;
        isDragging = false;
        currentDraggingBlock = null;
        draggableBlock.style.cursor = 'grab';

        // Always snap to grid after dragging stops
        const currentLeft = parseFloat(draggableBlock.style.left) || 0;
        const currentTop = parseFloat(draggableBlock.style.top) || 0;

        // 确保gridSize不为0，避免除以0的错误
        if (gridSize <= 0) {
            console.error('网格大小计算错误，gridSize =', gridSize);
            return;
        }

        // 获取容器和方块的尺寸信息进行边界检查
        const containerRect = container.getBoundingClientRect();
        const blockWidth = draggableBlock.offsetWidth;
        const blockHeight = draggableBlock.offsetHeight;
        
        // 边界检查参数
        const minX = 0;
        const minY = 0;
        const maxX = containerRect.width - blockWidth;
        const maxY = containerRect.height - blockHeight;
        
        // 先进行网格对齐（基于当前位置）
        let snappedLeft = Math.round(currentLeft / gridSize) * gridSize;
        let snappedTop = Math.round(currentTop / gridSize) * gridSize;
        
        // 如果网格对齐后超出边界，尝试对齐到边界内最近的网格点
        if (snappedLeft < minX) {
            snappedLeft = Math.ceil(minX / gridSize) * gridSize;
        } else if (snappedLeft > maxX) {
            snappedLeft = Math.floor(maxX / gridSize) * gridSize;
        }
        
        if (snappedTop < minY) {
            snappedTop = Math.ceil(minY / gridSize) * gridSize;
        } else if (snappedTop > maxY) {
            snappedTop = Math.floor(maxY / gridSize) * gridSize;
        }
        
        // 最终边界检查（确保不会超出容器）
        snappedLeft = Math.max(minX, Math.min(maxX, snappedLeft));
        snappedTop = Math.max(minY, Math.min(maxY, snappedTop));
        
        //console.log('对齐网格:', { currentLeft, currentTop, snappedLeft, snappedTop, gridSize });

        // Apply snapped position
        draggableBlock.style.left = `${snappedLeft}px`;
        draggableBlock.style.top = `${snappedTop}px`;

        // 检测并解决完全重叠问题
        resolveOverlap(draggableBlock, gridSize);

        // 重新排序所有方块的 z-index
        const allDraggableBlocks = document.querySelectorAll('.draggable');
        const sortedBlocks = Array.from(allDraggableBlocks).sort((a, b) => {
            return parseFloat(b.style.top || '0') - parseFloat(a.style.top || '0');
        });

        sortedBlocks.forEach((block, index) => {
            block.style.zIndex = `${index + 10010}`; // 越靠上 z-index 越大，基础值高于菜单
        });
        
        // 移除事件监听器
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('mouseup', stopHandler);
        document.removeEventListener('touchend', stopHandler);
        document.removeEventListener('mouseleave', stopHandler);
        document.removeEventListener('touchcancel', stopHandler);
        
        // 重置点击状态，为下一次交互做准备
        setTimeout(() => {
            isClick = true;
        }, 0);
        
        // 更新按钮状态（拖动可能改变初始位置占用状态）
        updateButtonStates();
    };
}

/**
 * 解决旗帜完全重叠问题
 */
function resolveOverlap(currentBlock, gridSize) {
    const allBlocks = document.querySelectorAll('.draggable');
    const currentRect = getBlockRect(currentBlock);
    
    // 检查是否与其他旗帜完全重叠
    for (let otherBlock of allBlocks) {
        if (otherBlock === currentBlock) continue;
        
        const otherRect = getBlockRect(otherBlock);
        
        // 检测完全重叠（位置完全相同）
        if (currentRect.left === otherRect.left && currentRect.top === otherRect.top) {
            // 找到最近的安全位置
            const safePosition = findNearestSafePosition(currentRect, gridSize, allBlocks, currentBlock);
            currentBlock.style.left = `${safePosition.left}px`;
            currentBlock.style.top = `${safePosition.top}px`;
            break; // 只需要解决一次重叠
        }
    }
}

/**
 * 获取方块的位置信息
 */
function getBlockRect(block) {
    return {
        left: parseFloat(block.style.left) || 0,
        top: parseFloat(block.style.top) || 0,
        width: block.offsetWidth,
        height: block.offsetHeight
    };
}

/**
 * 找到最近的安全位置
 */
function findNearestSafePosition(currentRect, gridSize, allBlocks, currentBlock) {
    const directions = [
        { dx: 1, dy: 0 },   // 右
        { dx: 0, dy: 1 },   // 下
        { dx: -1, dy: 0 },  // 左
        { dx: 0, dy: -1 },  // 上
        { dx: 1, dy: 1 },   // 右下
        { dx: -1, dy: 1 },  // 左下
        { dx: 1, dy: -1 },  // 右上
        { dx: -1, dy: -1 }  // 左上
    ];
    
    // 从距离1开始搜索
    for (let distance = 1; distance <= 10; distance++) {
        for (let direction of directions) {
            const newLeft = currentRect.left + (direction.dx * gridSize * distance);
            const newTop = currentRect.top + (direction.dy * gridSize * distance);
            
            // 确保位置不为负数
            if (newLeft < 0 || newTop < 0) continue;
            
            // 检查这个位置是否安全（没有其他旗帜）
            if (isPositionSafe(newLeft, newTop, allBlocks, currentBlock)) {
                return { left: newLeft, top: newTop };
            }
        }
    }
    
    // 如果找不到安全位置，返回右下方的位置
    return {
        left: currentRect.left + gridSize,
        top: currentRect.top + gridSize
    };
}

/**
 * 检查位置是否安全（没有其他旗帜占用）
 */
function isPositionSafe(left, top, allBlocks, currentBlock) {
    for (let block of allBlocks) {
        if (block === currentBlock) continue;
        
        const blockRect = getBlockRect(block);
        if (blockRect.left === left && blockRect.top === top) {
            return false; // 位置被占用
        }
    }
    return true; // 位置安全
}

/**
 * 处理方块交互
 */
function handleBlockInteraction(e, draggableBlock) {
    // 阻止事件冒泡
    e.stopPropagation();
    
    // 如果当前有其他方块在拖拽，先停止拖拽
    if (isDragging) {
        isDragging = false;
        currentDraggingBlock = null;
        // 重置所有方块的cursor样式
        document.querySelectorAll('.draggable').forEach(block => {
            block.style.cursor = 'grab';
        });
    }
    
    // 移除所有方块的编辑状态
    document.querySelectorAll('.draggable.editing').forEach(block => {
        block.classList.remove('editing');
    });
    
    // 设置当前方块为编辑状态
    setCurrentEditingBlock(draggableBlock);
    draggableBlock.classList.add('editing');
}



/**
 * 获取触摸或鼠标坐标
 */
function getCoords(e) {
    if (e.touches) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
        return { x: e.clientX, y: e.clientY };
    }
}

// 获取坐标的函数保留，因为它仍然有用

/**
 * 初始化图形化编辑器
 */
function initGraphicalEditor() {
    createPatternButtons();
    createColorButtons();
    setupEditorEventListeners();
}

/**
 * 创建图案按钮
 */
function createPatternButtons() {
    const patternContainer = document.getElementById('patternButtons');
    
    allPatternImages.forEach(patternFile => {
        const button = document.createElement('div');
        button.className = 'pattern-btn';
        button.style.backgroundImage = `url('../ButtonPatterns/${patternFile}')`;
        button.title = patternFile.replace('.png', '');
        button.dataset.pattern = patternFile.replace('.png', '');
        
        button.addEventListener('click', () => {
            addPatternToBlock(patternFile.replace('.png', ''));
        });
        
        patternContainer.appendChild(button);
    });
}

/**
 * 创建颜色按钮
 */
function createColorButtons() {
    const colorContainer = document.getElementById('colorButtons');
    
    COLORS.forEach(color => {
        const button = document.createElement('div');
        button.className = 'color-btn';
        button.style.backgroundColor = `#${color.hex}`;
        button.title = color.name;
        button.dataset.colorIndex = color.index;
        
        // 默认选择黑色
        if (color.index === selectedColor) {
            button.classList.add('selected');
        }
        
        button.addEventListener('click', () => {
            selectColor(color.index, button);
        });
        
        colorContainer.appendChild(button);
    });
}

/**
 * 设置编辑器事件监听器
 */
function setupEditorEventListeners() {
    const deleteBtn = document.getElementById('deleteLastPattern');
    const deleteBlockBtn = document.getElementById('deleteBlock');
    const editBackgroundBtn = document.getElementById('editBackgroundBtn');
    
    deleteBtn.addEventListener('click', deleteLastPattern);
    deleteBlockBtn.addEventListener('click', deleteCurrentBlock);
    
    // 绑定编辑背景颜色按钮事件
    editBackgroundBtn.addEventListener('click', toggleBackgroundEditMode);
}

/**
 * 设置当前编辑方块
 */
function setCurrentEditingBlock(block) {
    currentEditingBlock = block;
    updatePatternDisplay();
    updateButtonStates(); // 更新按钮状态
}

/**
 * 删除当前方块
 */
function deleteCurrentBlock() {
    if (!currentEditingBlock) return;
    
    currentEditingBlock.remove();
    currentEditingBlock = null;
    updatePatternDisplay(); // 更新图案显示
    updateButtonStates(); // 更新按钮状态
}

/**
 * 选择颜色
 */
function selectColor(colorIndex, buttonElement) {
    // 移除之前选中的颜色
    document.querySelectorAll('.color-btn.selected').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // 选中新颜色
    buttonElement.classList.add('selected');
    selectedColor = colorIndex;
    
    // 如果处于编辑背景颜色模式，修改背景颜色
    if (isEditingBackground && currentEditingBlock) {
        changeBackgroundColor(colorIndex);
        // 退出编辑背景颜色模式
        isEditingBackground = false;
        updateBackgroundButtonState();
    }
}

/**
 * 添加图案到方块
 */
function addPatternToBlock(patternName) {
    if (!currentEditingBlock) return;
    
    const currentLayers = currentEditingBlock.dataset.multipleLayers || '';
    const newLayer = `${selectedColor}${patternName}`;
    
    if (currentLayers) {
        currentEditingBlock.dataset.multipleLayers = `${currentLayers},${newLayer}`;
    } else {
        currentEditingBlock.dataset.multipleLayers = newLayer;
    }
    
    // 更新图案显示
    updatePatternDisplay();
}

/**
 * 删除最后添加的图案
 */
function deleteLastPattern() {
    if (!currentEditingBlock) return;
    
    const currentLayers = currentEditingBlock.dataset.multipleLayers || '';
    if (!currentLayers) return;
    
    const layers = currentLayers.split(',');
    // 如果只剩一层就不删除
    if (layers.length <= 1) return;
    
    layers.pop(); // 删除最后一个图案
    
    currentEditingBlock.dataset.multipleLayers = layers.join(',');
    
    // 更新图案显示
    updatePatternDisplay();
}

/**
 * 切换背景颜色编辑模式
 */
function toggleBackgroundEditMode() {
    isEditingBackground = !isEditingBackground;
    updateBackgroundButtonState();
}

/**
 * 更新背景颜色编辑按钮状态
 */
function updateBackgroundButtonState() {
    const editBackgroundBtn = document.getElementById('editBackgroundBtn');
    if (isEditingBackground) {
        editBackgroundBtn.textContent = '取消编辑背景';
        editBackgroundBtn.style.backgroundColor = '#e74c3c';
    } else {
        editBackgroundBtn.textContent = '编辑背景颜色';
        editBackgroundBtn.style.backgroundColor = '';
    }
}

/**
 * 修改背景颜色（旗帜第一个元素base）
 */
function changeBackgroundColor(colorIndex) {
    if (!currentEditingBlock) return;
    
    const currentLayers = currentEditingBlock.dataset.multipleLayers || '';
    if (!currentLayers) return;
    
    const layers = currentLayers.split(',');
    if (layers.length === 0) return;
    
    // 修改第一个元素（base）的颜色
    const firstLayer = layers[0];
    if (firstLayer.length >= 2) {
        // 保持图案名称，只修改颜色
        const patternName = firstLayer.substring(1);
        layers[0] = `${colorIndex}${patternName}`;
        currentEditingBlock.dataset.multipleLayers = layers.join(',');
        
        // 记住这次选择的背景颜色
        lastBackgroundColor = colorIndex;
        
        // 更新图案显示
        updatePatternDisplay();
    }
}

/**
 * 更新顶部图案显示区域
 */
function updatePatternDisplay() {
    const patternIconsContainer = document.getElementById('patternIcons');
    const patternDisplay = document.getElementById('patternDisplay');
    if (!patternIconsContainer || !patternDisplay) return;
    
    // 清空现有内容
    patternIconsContainer.innerHTML = '';
    
    if (!currentEditingBlock) {
        // 没有选中旗帜时隐藏整个图案显示区域
        patternDisplay.style.display = 'none';
        return;
    }
    
    // 有选中旗帜时显示图案显示区域
    patternDisplay.style.display = 'block';
    
    const currentLayers = currentEditingBlock.dataset.multipleLayers || '';
    if (!currentLayers) {
        patternIconsContainer.innerHTML = '<span style="color: #999; font-style: italic;">当前旗帜无图案</span>';
        return;
    }
    
    const layers = currentLayers.split(',');
    let patternIndex = 1; // 从1开始编号
    layers.forEach((layer, index) => {
        if (layer.length >= 2) {
            const colorIndex = layer.charAt(0);
            const patternName = layer.substring(1);
            
            // 跳过base图案
            if (patternName === 'base') {
                return;
            }
            
            // 创建图案图标
            const iconDiv = document.createElement('div');
            iconDiv.className = 'pattern-icon';
            iconDiv.style.cursor = 'grab';
            iconDiv.title = '拖拽调整顺序，点击删除此图案';
            iconDiv.draggable = true;
            iconDiv.dataset.layerIndex = index;
            
            // 设置背景图片（和图案按钮一样的方式）
            iconDiv.style.backgroundImage = `url('../ButtonPatterns/${patternName}.png')`;
            
            // 创建层级编号 - 已隐藏
            // const layerNumber = document.createElement('div');
            // layerNumber.className = 'layer-number';
            // layerNumber.textContent = patternIndex++;
            
            // 根据颜色设置边框颜色
            const colorInfo = COLORS.find(c => c.index === colorIndex);
            if (colorInfo) {
                iconDiv.style.borderColor = colorInfo.hex;
                iconDiv.style.borderWidth = '3px';
            }
            
            // 添加拖拽事件监听器（桌面端）
            iconDiv.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                iconDiv.classList.add('dragging');
            });
            
            iconDiv.addEventListener('dragend', (e) => {
                iconDiv.classList.remove('dragging');
                // 移除所有拖拽悬停效果
                document.querySelectorAll('.pattern-icon.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
            });
            
            iconDiv.addEventListener('dragenter', (e) => {
                e.preventDefault();
                if (!iconDiv.classList.contains('dragging')) {
                    iconDiv.classList.add('drag-over');
                }
            });
            
            iconDiv.addEventListener('dragleave', (e) => {
                e.preventDefault();
                iconDiv.classList.remove('drag-over');
            });
            
            iconDiv.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            iconDiv.addEventListener('drop', (e) => {
                e.preventDefault();
                iconDiv.classList.remove('drag-over');
                const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const targetIndex = parseInt(iconDiv.dataset.layerIndex);
                if (draggedIndex !== targetIndex) {
                    reorderPatterns(draggedIndex, targetIndex);
                }
            });
            
            // 添加触摸事件监听器（移动端）
            let touchStartX = 0;
            let touchStartY = 0;
            let isDragging = false;
            let draggedElement = null;
            let placeholder = null;
            let longPressTimer = null;
            
            iconDiv.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                isDragging = false;
                draggedElement = iconDiv;
                
                // 清除之前的定时器
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                }
                
                // 添加长按检测
                longPressTimer = setTimeout(() => {
                    if (draggedElement === iconDiv && !isDragging) {
                        isDragging = true;
                        iconDiv.classList.add('dragging');
                        
                        // 创建占位符
                        placeholder = iconDiv.cloneNode(true);
                        placeholder.style.opacity = '0.3';
                        placeholder.classList.add('placeholder');
                        iconDiv.parentNode.insertBefore(placeholder, iconDiv.nextSibling);
                        
                        // 设置拖拽样式
                        iconDiv.style.position = 'fixed';
                        iconDiv.style.zIndex = '1000';
                        iconDiv.style.pointerEvents = 'none';
                        iconDiv.style.transform = 'scale(1.1)';
                        
                        // 添加触觉反馈（如果支持）
                        if (navigator.vibrate) {
                            navigator.vibrate(50);
                        }
                    }
                    longPressTimer = null;
                }, 200); // 200ms长按检测
            });
            
            iconDiv.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                
                const touch = e.touches[0];
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;
                
                // 移动拖拽元素
                iconDiv.style.left = (touch.clientX - iconDiv.offsetWidth / 2) + 'px';
                iconDiv.style.top = (touch.clientY - iconDiv.offsetHeight / 2) + 'px';
                
                // 检测拖拽目标
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetIcon = elementBelow?.closest('.pattern-icon:not(.dragging):not(.placeholder)');
                
                // 移除所有悬停效果
                document.querySelectorAll('.pattern-icon.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
                
                // 添加悬停效果
                if (targetIcon && targetIcon !== iconDiv) {
                    targetIcon.classList.add('drag-over');
                }
            });
            
            iconDiv.addEventListener('touchend', (e) => {
                // 清除长按定时器
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                
                if (!isDragging) {
                    draggedElement = null;
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                // 获取触摸结束位置的元素
                const touch = e.changedTouches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetIcon = elementBelow?.closest('.pattern-icon:not(.dragging):not(.placeholder)');
                
                // 执行重排序
                if (targetIcon) {
                    const draggedIndex = parseInt(iconDiv.dataset.layerIndex);
                    const targetIndex = parseInt(targetIcon.dataset.layerIndex);
                    if (draggedIndex !== targetIndex) {
                        reorderPatterns(draggedIndex, targetIndex);
                    }
                }
                
                // 清理拖拽状态
                iconDiv.classList.remove('dragging');
                iconDiv.style.position = '';
                iconDiv.style.zIndex = '';
                iconDiv.style.pointerEvents = '';
                iconDiv.style.transform = '';
                iconDiv.style.left = '';
                iconDiv.style.top = '';
                
                // 移除占位符
                if (placeholder) {
                    placeholder.remove();
                    placeholder = null;
                }
                
                // 移除所有悬停效果
                document.querySelectorAll('.pattern-icon.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
                
                isDragging = false;
                draggedElement = null;
            });
            
            // 添加点击删除功能
            iconDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePatternFromFlag(index);
            });
            
            // iconDiv.appendChild(layerNumber);
            patternIconsContainer.appendChild(iconDiv);
        }
    });
}

/**
 * 删除旗帜中指定索引的图案
 */
function deletePatternFromFlag(patternIndex) {
    if (!currentEditingBlock) return;
    
    const currentLayers = currentEditingBlock.dataset.multipleLayers || '';
    if (!currentLayers) return;
    
    const layers = currentLayers.split(',');
    
    // 删除指定索引的图案
    if (patternIndex >= 0 && patternIndex < layers.length) {
        layers.splice(patternIndex, 1);
        
        // 更新旗帜的图案数据
        currentEditingBlock.dataset.multipleLayers = layers.join(',');
        
        // 图像会通过MutationObserver自动更新
     }
        
        // 更新图案显示
        updatePatternDisplay();
    }

/**
 * 重新排序图案
 */
function reorderPatterns(fromIndex, toIndex) {
    if (!currentEditingBlock) return;
    
    const currentLayers = currentEditingBlock.dataset.multipleLayers || '';
    if (!currentLayers) return;
    
    const layers = currentLayers.split(',');
    
    // 确保索引有效
    if (fromIndex < 0 || fromIndex >= layers.length || toIndex < 0 || toIndex >= layers.length) {
        return;
    }
    
    // 移动图案
    const movedLayer = layers.splice(fromIndex, 1)[0];
    layers.splice(toIndex, 0, movedLayer);
    
    // 更新旗帜的图案数据
    currentEditingBlock.dataset.multipleLayers = layers.join(',');
    
    // 更新图案显示
    updatePatternDisplay();
}

/**
 * 检测初始位置是否有旗帜
 */
function isInitialPositionOccupied() {
    // 动态计算网格大小
    const allBlocks = document.querySelectorAll('.draggable');
    if (allBlocks.length === 0) return false;
    
    // 使用第一个方块来计算网格大小
    const firstBlock = allBlocks[0];
    const gridSize = Math.floor(firstBlock.offsetWidth * 1.15);
    
    const initialLeft = 0;
    const initialTop = gridSize;
    
    for (let block of allBlocks) {
        const blockLeft = parseInt(block.style.left) || 0;
        const blockTop = parseInt(block.style.top) || 0;
        
        // 检查是否在初始位置
        if (Math.abs(blockLeft - initialLeft) < 5 && Math.abs(blockTop - initialTop) < 5) {
            return true;
        }
    }
    
    return false;
}

/**
 * 更新按钮状态
 */
function updateButtonStates() {
    const addBlockBtn = document.getElementById('addBlockBtn');
    const editBackgroundBtn = document.getElementById('editBackgroundBtn');
    const deleteLastPatternBtn = document.getElementById('deleteLastPattern');
    const deleteBlockBtn = document.getElementById('deleteBlock');
    
    // 检测初始位置是否有旗帜
    const initialPositionOccupied = isInitialPositionOccupied();
    
    // 添加按钮：如果初始位置有旗帜则禁用
    if (addBlockBtn) {
        addBlockBtn.disabled = initialPositionOccupied;
        addBlockBtn.style.opacity = initialPositionOccupied ? '0.5' : '1';
        addBlockBtn.style.cursor = initialPositionOccupied ? 'not-allowed' : 'pointer';
    }
    
    // 检测是否有选中的旗帜
    const hasSelectedFlag = currentEditingBlock !== null;
    
    // 编辑背景颜色按钮：如果没有选中旗帜则禁用
    if (editBackgroundBtn) {
        editBackgroundBtn.disabled = !hasSelectedFlag;
        editBackgroundBtn.style.opacity = hasSelectedFlag ? '1' : '0.5';
        editBackgroundBtn.style.cursor = hasSelectedFlag ? 'pointer' : 'not-allowed';
    }
    
    // 删除最后图案按钮：如果没有选中旗帜则禁用
    if (deleteLastPatternBtn) {
        deleteLastPatternBtn.disabled = !hasSelectedFlag;
        deleteLastPatternBtn.style.opacity = hasSelectedFlag ? '1' : '0.5';
        deleteLastPatternBtn.style.cursor = hasSelectedFlag ? 'pointer' : 'not-allowed';
    }
    
    // 删除选中旗帜按钮：如果没有选中旗帜则禁用
    if (deleteBlockBtn) {
        deleteBlockBtn.disabled = !hasSelectedFlag;
        deleteBlockBtn.style.opacity = hasSelectedFlag ? '1' : '0.5';
        deleteBlockBtn.style.cursor = hasSelectedFlag ? 'pointer' : 'not-allowed';
    }
    
    // 复制选中旗帜菜单项：如果没有选中旗帜则禁用
    const copyFlagItem = document.getElementById('copyFlagItem');
    if (copyFlagItem) {
        copyFlagItem.style.opacity = hasSelectedFlag ? '1' : '0.5';
        copyFlagItem.style.cursor = hasSelectedFlag ? 'pointer' : 'not-allowed';
        copyFlagItem.style.pointerEvents = hasSelectedFlag ? 'auto' : 'none';
    }
    
    // 导出选中旗帜菜单项：如果没有选中旗帜则禁用
    const exportFlagItem = document.getElementById('exportFlagItem');
    if (exportFlagItem) {
        exportFlagItem.style.opacity = hasSelectedFlag ? '1' : '0.5';
        exportFlagItem.style.cursor = hasSelectedFlag ? 'pointer' : 'not-allowed';
        exportFlagItem.style.pointerEvents = hasSelectedFlag ? 'auto' : 'none';
    }
    
    // 生成Minecraft命令菜单项：如果没有选中旗帜则禁用
    const generateMinecraftItem = document.getElementById('generateMinecraftItem');
    if (generateMinecraftItem) {
        generateMinecraftItem.style.opacity = hasSelectedFlag ? '1' : '0.5';
        generateMinecraftItem.style.cursor = hasSelectedFlag ? 'pointer' : 'not-allowed';
        generateMinecraftItem.style.pointerEvents = hasSelectedFlag ? 'auto' : 'none';
    }
}

// 显示确认对话框
function showConfirmDialog(title, message, onConfirm) {
    const dialog = document.getElementById('confirmDialog');
    const titleElement = document.getElementById('confirmTitle');
    const messageElement = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');
    
    if (!dialog || !titleElement || !messageElement || !yesBtn || !noBtn) {
        console.error('确认对话框元素未找到');
        return;
    }
    
    titleElement.textContent = title;
    messageElement.textContent = message;
    dialog.style.display = 'flex';
    
    // 移除之前的事件监听器
    const newYesBtn = yesBtn.cloneNode(true);
    const newNoBtn = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);
    
    // 添加新的事件监听器
    newYesBtn.addEventListener('click', () => {
        dialog.style.display = 'none';
        if (onConfirm) onConfirm();
    });
    
    newNoBtn.addEventListener('click', () => {
        dialog.style.display = 'none';
    });
    
    // ESC键关闭对话框
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            dialog.style.display = 'none';
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// 复制选中旗帜
function copySelectedFlag() {
    if (!currentEditingBlock) {
        alert('请先选择一个旗帜');
        return;
    }
    
    // 创建新的旗帜方块
    const newBlock = createDraggableBlock();
    
    // 复制当前选中旗帜的所有图案和背景色
    const originalMultipleLayers = currentEditingBlock.dataset.multipleLayers || '';
    const originalBackgroundColor = currentEditingBlock.dataset.backgroundColor || '#ffffff';
    
    // 设置新旗帜的背景色
    newBlock.dataset.backgroundColor = originalBackgroundColor;
    const newBlockImage = newBlock.querySelector('.block-image');
    if (newBlockImage) {
        newBlockImage.style.backgroundColor = originalBackgroundColor;
    }
    
    // 复制所有图案层
    if (originalMultipleLayers) {
        newBlock.dataset.multipleLayers = originalMultipleLayers;
        
        // 重新渲染图案
        const tempCurrentBlock = currentEditingBlock;
        currentEditingBlock = newBlock;
        updatePatternDisplay();
        currentEditingBlock = tempCurrentBlock;
    }
    
    // 设置新旗帜位置到初始位置
    const gridSize = Math.round(newBlock.offsetWidth * 1.15);
    const initialLeft = 0;
    const initialTop = gridSize; // 向下偏移一个网格单位，避免与顶部菜单重叠
    
    newBlock.style.left = initialLeft + 'px';
    newBlock.style.top = initialTop + 'px';
    
    // 应用重叠检查，如果初始位置被占用则自动找到安全位置
    resolveOverlap(newBlock, gridSize);
    
    // 选中新创建的旗帜
    setCurrentEditingBlock(newBlock);
    
    console.log('旗帜复制成功');
}

// 生成Minecraft命令
function generateMinecraftCommand() {
    if (!currentEditingBlock) {
        alert('请先选择一个旗帜');
        return;
    }
    
    // 获取选中旗帜的字符串数据
    const flagString = currentEditingBlock.dataset.multipleLayers || '';
    
    if (!flagString) {
        alert('选中的旗帜没有数据可生成命令');
        return;
    }
    
    // 转换为Minecraft命令
    const minecraftCommand = convertToMinecraftCommand(flagString);
    
    if (!minecraftCommand) {
        alert('转换Minecraft命令失败，请检查旗帜数据格式');
        return;
    }
    
    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 复制命令到剪贴板
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(minecraftCommand).then(() => {
            showTemporaryMessage('Minecraft命令已复制到剪贴板！');
            console.log('Minecraft命令已生成:', minecraftCommand);
        }).catch(err => {
            console.warn('现代剪贴板API失败，尝试备用方法:', err);
            fallbackCopyMethod(minecraftCommand, isMobile);
        });
    } else {
        // 备用复制方法
        fallbackCopyMethod(minecraftCommand, isMobile);
    }
}

// 导出选中旗帜至剪贴板
function exportSelectedFlagToClipboard() {
    if (!currentEditingBlock) {
        alert('请先选择一个旗帜');
        return;
    }
    
    // 获取选中旗帜的字符串数据
    const flagString = currentEditingBlock.dataset.multipleLayers || '';
    
    if (!flagString) {
        alert('选中的旗帜没有数据可导出');
        return;
    }
    
    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 复制到剪贴板
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(flagString).then(() => {
            showTemporaryMessage('旗帜字符串已复制到剪贴板！');
            console.log('旗帜字符串已导出:', flagString);
        }).catch(err => {
            console.warn('现代剪贴板API失败，尝试备用方法:', err);
            fallbackCopyMethod(flagString, isMobile);
        });
    } else {
        // 浏览器不支持现代剪贴板API，使用备用方法
        fallbackCopyMethod(flagString, isMobile);
    }
}

// 备用复制方法
function fallbackCopyMethod(text, isMobile) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        
        if (isMobile) {
            // 移动设备特殊处理
            textArea.style.fontSize = '16px'; // 防止iOS缩放
            textArea.setAttribute('readonly', '');
            textArea.select();
            textArea.setSelectionRange(0, 99999); // 移动设备需要设置选择范围
        } else {
            textArea.select();
        }
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            showTemporaryMessage('旗帜字符串已复制到剪贴板！');
            console.log('旗帜字符串已导出:', text);
        } else {
            throw new Error('execCommand failed');
        }
    } catch (fallbackErr) {
        console.error('所有复制方法都失败:', fallbackErr);
        // 在移动设备上显示更友好的提示
        if (isMobile) {
            showCopyDialog(text);
        } else {
            alert('复制到剪贴板失败，请手动复制：\n' + text);
        }
    }
}

// 显示复制对话框（移动设备友好）
function showCopyDialog(text) {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        z-index: 10025;
        max-width: 90%;
        max-height: 80%;
        overflow: auto;
    `;
    
    dialog.innerHTML = `
        <h3>请手动复制以下内容：</h3>
        <textarea readonly style="width: 100%; height: 100px; margin: 10px 0; font-family: monospace; font-size: 14px;">${text}</textarea>
        <button onclick="this.parentElement.remove()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭</button>
    `;
    
    document.body.appendChild(dialog);
    
    // 自动选择文本
    const textarea = dialog.querySelector('textarea');
    setTimeout(() => {
        textarea.focus();
        textarea.select();
    }, 100);
}

// 从剪贴板导入旗帜
function importFlagFromClipboard() {
    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 读取剪贴板内容
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(text => {
            processImportedFlag(text);
        }).catch(err => {
            console.warn('现代剪贴板API读取失败，尝试备用方法:', err);
            fallbackReadMethod(isMobile);
        });
    } else {
        // 浏览器不支持现代剪贴板API，使用备用方法
        fallbackReadMethod(isMobile);
    }
}

// 备用读取方法
function fallbackReadMethod(isMobile) {
    if (isMobile) {
        // 移动设备显示输入对话框
        showImportDialog();
    } else {
        // 桌面设备尝试使用传统方法或显示输入对话框
        showImportDialog();
    }
}

// 显示导入对话框
function showImportDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        z-index: 10025;
        max-width: 90%;
        max-height: 80%;
        overflow: auto;
    `;
    
    dialog.innerHTML = `
        <h3>导入旗帜数据</h3>
        <p>请粘贴旗帜字符串：</p>
        <textarea id="importTextarea" placeholder="请粘贴旗帜字符串..." style="width: 100%; height: 100px; margin: 10px 0; font-family: monospace; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; padding: 8px;"></textarea>
        <div style="text-align: right; margin-top: 10px;">
            <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">取消</button>
            <button id="importConfirmBtn" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">导入</button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 自动聚焦到文本框
    const textarea = dialog.querySelector('#importTextarea');
    setTimeout(() => {
        textarea.focus();
    }, 100);
    
    // 绑定导入按钮事件
    const confirmBtn = dialog.querySelector('#importConfirmBtn');
    confirmBtn.addEventListener('click', () => {
        const text = textarea.value.trim();
        if (text) {
            processImportedFlag(text);
            dialog.remove();
        } else {
            alert('请输入有效的旗帜字符串');
        }
    });
    
    // 支持回车键导入
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            confirmBtn.click();
        }
    });
}

// 处理导入的旗帜数据
function processImportedFlag(flagString) {
    try {
        // 验证旗帜字符串格式
        if (!flagString || typeof flagString !== 'string') {
            throw new Error('无效的旗帜字符串格式');
        }
        
        // 简单验证：检查是否包含base
        if (!flagString.includes('base')) {
            throw new Error('旗帜字符串必须包含base图案');
        }
        
        // 创建新的旗帜方块
        const newBlock = createDraggableBlock();
        
        // 设置旗帜数据
        newBlock.dataset.multipleLayers = flagString;
        
        // 解析背景颜色（从字符串开头提取）
        const colorMatch = flagString.match(/^([a-zA-Z_]+)/);
        if (colorMatch) {
            newBlock.dataset.backgroundColor = colorMatch[1];
        }
        
        // 重新生成旗帜图像
        const blockImage = newBlock.querySelector('img');
        if (blockImage) {
            MultipleLayers(flagString).then(result => {
                // 处理OffscreenCanvas或ImageBitmap
                if (result instanceof OffscreenCanvas) {
                    // OffscreenCanvas需要转换为Blob再转换为URL
                    result.convertToBlob().then(blob => {
                        const url = URL.createObjectURL(blob);
                        blockImage.src = url;
                        // 图像加载后释放URL
                        blockImage.onload = () => URL.revokeObjectURL(url);
                    }).catch(err => {
                        console.error('转换OffscreenCanvas失败:', err);
                        showTemporaryMessage('导入成功，但图像生成失败');
                    });
                } else if (result instanceof ImageBitmap) {
                    // ImageBitmap需要先绘制到canvas再转换
                    const canvas = document.createElement('canvas');
                    canvas.width = result.width;
                    canvas.height = result.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(result, 0, 0);
                    blockImage.src = canvas.toDataURL();
                } else {
                    console.error('未知的图像类型:', result);
                    showTemporaryMessage('导入成功，但图像生成失败');
                }
            }).catch(err => {
                console.error('生成旗帜图像失败:', err);
                showTemporaryMessage('导入成功，但图像生成失败');
            });
        }
        
        // 设置为当前编辑方块
        setCurrentEditingBlock(newBlock);
        
        // 更新界面
        updatePatternDisplay();
        updateButtonStates();
        
        showTemporaryMessage('旗帜导入成功！');
        console.log('旗帜导入成功:', flagString);
        
    } catch (error) {
        console.error('导入旗帜失败:', error);
        alert('导入失败：' + error.message);
    }
}

// 显示临时消息提示
function showTemporaryMessage(message) {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        font-size: 16px;
        z-index: 20001;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    // 显示动画
    setTimeout(() => {
        messageDiv.style.opacity = '1';
    }, 10);
    
    // 2秒后隐藏并移除
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                document.body.removeChild(messageDiv);
            }
        }, 300);
    }, 2000);
}

// 导出所有旗帜至潜影盒
function exportToShulkerBox() {
    const allFlags = document.querySelectorAll('.draggable');
    
    if (allFlags.length === 0) {
        alert('面板中没有旗帜可导出');
        return;
    }
    
    // 获取所有旗帜的位置和数据
    const flagsData = [];
    allFlags.forEach((flag) => {
        const rect = flag.getBoundingClientRect();
        const containerRect = flag.parentElement.getBoundingClientRect();
        
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;
        const flagString = flag.dataset.multipleLayers || '';
        
        if (flagString) {
            flagsData.push({ x, y, flagString });
        }
    });
    
    if (flagsData.length === 0) {
        alert('没有有效的旗帜数据可导出');
        return;
    }
    
    // 按x坐标优先，从左往右，从上往下排序
    flagsData.sort((a, b) => {
        if (Math.abs(a.x - b.x) < 10) { // 如果x坐标相近（容差10px），按y坐标排序
            return a.y - b.y;
        }
        return a.x - b.x;
    });
    
    // 转换每个旗帜为Minecraft物品格式
    const items = [];
    for (let i = 0; i < flagsData.length; i++) {
        const flagData = flagsData[i];
        const minecraftCommand = convertToMinecraftCommand(flagData.flagString);
        if (minecraftCommand) {
            // 从命令中提取旗帜ID和组件
            const bannerMatch = minecraftCommand.match(/minecraft:([a-z_]+_banner)/);
            const componentsMatch = minecraftCommand.match(/\[minecraft:banner_patterns=\[([^\]]+)\]\]/);
            
            if (bannerMatch) {
                const bannerId = bannerMatch[1];
                let components = '{}';
                
                if (componentsMatch) {
                    // 解析banner_patterns
                    const patternsStr = componentsMatch[1];
                    components = `{"minecraft:banner_patterns":[${patternsStr}]}`;
                }
                
                items.push(`{slot:${i}b,item:{id:"minecraft:${bannerId}",components:${components}}}`);
            }
        }
    }
    
    if (items.length === 0) {
        alert('转换Minecraft物品失败');
        return;
    }
    
    // 生成潜影盒指令
    const shulkerBoxCommand = `/give @s minecraft:shulker_box[minecraft:container=[${items.join(',')}]]`;
    
    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 复制命令到剪贴板
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shulkerBoxCommand).then(() => {
            showTemporaryMessage(`潜影盒命令已复制到剪贴板！(包含${items.length}个旗帜)`);
            console.log('潜影盒命令已生成:', shulkerBoxCommand);
        }).catch(err => {
            console.warn('现代剪贴板API失败，尝试备用方法:', err);
            fallbackCopyMethod(shulkerBoxCommand, isMobile);
        });
    } else {
        // 备用复制方法
        fallbackCopyMethod(shulkerBoxCommand, isMobile);
    }
}

// 清除所有旗帜
function clearAllFlags() {
    const allBlocks = document.querySelectorAll('.draggable');
    allBlocks.forEach(block => {
        block.remove();
    });
    
    // 重置相关状态
    currentEditingBlock = null;
    blockCount = 0;
    updatePatternDisplay();
    updateButtonStates();
    
    console.log('所有旗帜已清除');
}

// 页面刷新前确认
 window.addEventListener('beforeunload', (e) => {
    console.log('beforeunload event triggered');
    e.preventDefault();
    e.returnValue = '确定要离开页面吗？';
    return e.returnValue;
});

// 添加用户交互检测
let userInteracted = false;
document.addEventListener('click', () => {
    userInteracted = true;
    console.log('User interaction detected');
}, { once: true });

// 导出整个面板到剪贴板
function exportPanelToClipboard() {
    const allFlags = document.querySelectorAll('.draggable');
    
    if (allFlags.length === 0) {
        alert('面板中没有旗帜可导出');
        return;
    }
    
    // 计算动态网格大小（与其他函数保持一致）
    const firstFlag = allFlags[0];
    const gridSize = Math.floor(firstFlag.offsetWidth * 1.15);
    
    const panelData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        gridSize: gridSize, // 保存网格大小信息
        flags: []
    };
    
    allFlags.forEach((flag, index) => {
        const rect = flag.getBoundingClientRect();
        const containerRect = flag.parentElement.getBoundingClientRect();
        
        // 使用动态计算的网格大小进行坐标转换
        const gridX = Math.round((rect.left - containerRect.left) / gridSize);
        const gridY = Math.round((rect.top - containerRect.top) / gridSize);
        
        const flagData = {
            x: gridX,
            y: gridY,
            layers: flag.dataset.multipleLayers || ''
        };
        
        panelData.flags.push(flagData);
    });
    
    const panelString = JSON.stringify(panelData, null, 2);
    
    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 复制到剪贴板
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(panelString).then(() => {
            showTemporaryMessage(`面板数据已复制到剪贴板！(包含${panelData.flags.length}个旗帜)`);
            console.log('面板数据已导出:', panelData);
        }).catch(err => {
            console.warn('现代剪贴板API失败，尝试备用方法:', err);
            fallbackCopyMethod(panelString, isMobile);
        });
    } else {
        // 浏览器不支持现代剪贴板API，使用备用方法
        fallbackCopyMethod(panelString, isMobile);
    }
}

// 从剪贴板导入面板数据
function importPanelFromClipboard() {
    // 检测是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 读取剪贴板内容
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(text => {
            processPanelImport(text);
        }).catch(err => {
            console.warn('现代剪贴板API读取失败，尝试备用方法:', err);
            showPanelImportDialog();
        });
    } else {
        // 浏览器不支持现代剪贴板API，使用备用方法
        showPanelImportDialog();
    }
}

// 显示面板导入对话框
function showPanelImportDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        z-index: 10025;
        max-width: 90%;
        max-height: 80%;
        overflow: auto;
    `;
    
    dialog.innerHTML = `
        <h3>导入面板数据</h3>
        <p>请粘贴面板JSON数据：</p>
        <textarea id="panelImportTextarea" placeholder="请粘贴面板JSON数据..." style="width: 100%; height: 150px; margin: 10px 0; font-family: monospace; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; padding: 8px;"></textarea>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="panelImportCancel" style="padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; background: #f8f9fa; cursor: pointer;">取消</button>
            <button id="panelImportConfirm" style="padding: 8px 16px; border: 1px solid #007bff; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">导入</button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    const textarea = dialog.querySelector('#panelImportTextarea');
    const cancelBtn = dialog.querySelector('#panelImportCancel');
    const confirmBtn = dialog.querySelector('#panelImportConfirm');
    
    textarea.focus();
    
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(dialog);
    });
    
    confirmBtn.addEventListener('click', () => {
        const text = textarea.value.trim();
        if (text) {
            processPanelImport(text);
        }
        document.body.removeChild(dialog);
    });
    
    // ESC键关闭对话框
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(dialog);
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

// 处理面板导入数据
function processPanelImport(dataString) {
    try {
        const panelData = JSON.parse(dataString);
        
        if (!panelData.flags || !Array.isArray(panelData.flags)) {
            throw new Error('无效的面板数据格式');
        }
        
        // 确认导入操作
        const message = `确定要导入面板数据吗？\n\n包含 ${panelData.flags.length} 个旗帜\n导入时间: ${panelData.timestamp || '未知'}\n\n注意：这将清除当前面板中的所有旗帜！`;
        
        showConfirmDialog('导入面板确认', message, () => {
            importPanelData(panelData);
        });
        
    } catch (error) {
        console.error('面板数据解析失败:', error);
        alert('面板数据格式错误，请检查数据是否正确。\n\n错误信息: ' + error.message);
    }
}

// 为旗帜块添加拖拽功能
function makeDraggable(draggableBlock) {
    // 确保使用正确的CSS类，不覆盖样式
    // .draggable类已经定义了position: absolute, cursor: grab等样式
    
    // 临时添加到DOM以获取正确的尺寸
    draggableBlock.style.visibility = 'hidden';
    container.appendChild(draggableBlock);
    
    // 计算网格大小（与createBlockElement保持一致）
    const gridSize = Math.floor(draggableBlock.offsetWidth * 1.15);
    
    // 恢复可见性
    draggableBlock.style.visibility = 'visible';
    
    // 从DOM中移除，稍后会重新添加
    container.removeChild(draggableBlock);
    
    // 添加事件监听器
    setupBlockEventListeners(draggableBlock, null, gridSize);
}

// 执行面板数据导入
async function importPanelData(panelData) {
    try {
        // 清除现有旗帜
        clearAllFlags();
        
        // 获取容器
        const container = document.body;
        
        // 导入每个旗帜
        for (const flagData of panelData.flags) {
            if (!flagData.layers) continue;
            
            // 创建新的旗帜块
            const newBlock = document.createElement('div');
            newBlock.className = 'draggable';
            newBlock.dataset.multipleLayers = flagData.layers;
            
            // 创建图像元素（与createBlockImage保持一致）
            const blockImage = document.createElement('img');
            blockImage.className = 'block-image';
            blockImage.draggable = false;
            newBlock.appendChild(blockImage);
            
            // 设置图像更新逻辑
            setupImageUpdater(newBlock, blockImage);
            
            // 使用保存的网格大小信息进行坐标转换，如果没有则使用默认值
            const gridSize = panelData.gridSize || 64;
            const pixelX = flagData.x * gridSize;
            const pixelY = flagData.y * gridSize;
            
            newBlock.style.left = pixelX + 'px';
            newBlock.style.top = pixelY + 'px';
            
            // 生成旗帜图像
            try {
                const imageBitmap = await MultipleLayers(flagData.layers);
                if (imageBitmap) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 64;
                    canvas.height = 64;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imageBitmap, 0, 0, 64, 64);
                    
                    // 设置图像源而不是背景图像
                    blockImage.src = canvas.toDataURL();
                }
            } catch (error) {
                console.warn('生成旗帜图像失败:', error);
                // 使用默认样式
                newBlock.style.backgroundColor = '#ddd';
                newBlock.textContent = '?';
            }
            
            // 添加拖拽功能
            makeDraggable(newBlock);
            
            // 添加到容器
            container.appendChild(newBlock);
        }
        
        showTemporaryMessage(`面板导入成功！已导入 ${panelData.flags.length} 个旗帜`);
        console.log('面板导入完成:', panelData);
        
    } catch (error) {
        console.error('面板导入失败:', error);
        alert('面板导入失败: ' + error.message);
    }
}

document.addEventListener('keydown', () => {
    userInteracted = true;
    console.log('User interaction detected');
}, { once: true });

// 保存和加载功能已移除