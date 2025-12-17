import { Trie } from './trie.js';

/**
 * UTILITIES
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logger = {
    area: document.getElementById('log-area'),
    add: function(text) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `> ${text}`;
        this.area.appendChild(div);
        this.area.scrollTop = this.area.scrollHeight;
    },
    clear: function() {
        this.area.innerHTML = '';
    }
};

/**
 * VISUALIZATION ENGINE (TRIE ONLY)
 */
class TreeVisualizer {
    constructor() {
        // This is the inner layer that holds the nodes
        this.nodesLayer = document.getElementById('nodes-layer');
        // This is the SVG layer for lines
        this.svgLayer = document.getElementById('svg-layer');
        // This is the outer scrollable window
        this.scrollWindow = document.getElementById('simulation-container');
    }

    reset() {
        this.nodesLayer.innerHTML = '';
        this.svgLayer.innerHTML = '';
        // Reset width to default so it doesn't get stuck huge
        this.nodesLayer.style.width = '100%';
        this.svgLayer.style.width = '100%';
    }

    draw(rootNode) {
        this.reset();
        if (!rootNode) return;
        this.drawTrie(rootNode);
    }

    // --- TRIE LAYOUT ---
    drawTrie(rootNode) {
        const leafCount = (node) => {
            let count = 0;
            let hasChildren = false;
            for(let c of node.children) {
                if(c) {
                    count += leafCount(c);
                    hasChildren = true;
                }
            }
            return hasChildren ? count : 1;
        };

        const totalLeaves = leafCount(rootNode);
        
        // --- FIX START: DYNAMIC WIDTH CALCULATION ---
        // 1. Get the width of the visible screen (e.g., 300px on mobile, 1000px on desktop)
        const visibleWidth = this.scrollWindow.offsetWidth;
        
        // 2. Define a minimum width needed per leaf node (e.g., 60px)
        const minWidthPerLeaf = 60;
        
        // 3. Calculate how wide the tree WANTS to be
        const requiredWidth = totalLeaves * minWidthPerLeaf;

        // 4. Use the larger of the two. If tree is small, use screen width. If tree is huge, use required width.
        const effectiveWidth = Math.max(visibleWidth, requiredWidth);

        // 5. Apply this width to the DOM elements so the scrollbar appears
        this.nodesLayer.style.width = `${effectiveWidth}px`;
        this.svgLayer.style.width = `${effectiveWidth}px`;
        // --- FIX END ---

        const sectorWidth = effectiveWidth / totalLeaves;
        let currentLeafIndex = 0;

        const assignCoords = (node, level) => {
            if(!node) return;
            
            let activeChildren = node.children.filter(n => n !== null);
            
            node.y = 50 + (level * 80);

            if (activeChildren.length === 0) {
                node.x = (currentLeafIndex * sectorWidth) + (sectorWidth / 2);
                currentLeafIndex++;
            } else {
                for (let i = 0; i < 26; i++) {
                    if (node.children[i]) assignCoords(node.children[i], level + 1);
                }
                let firstChild = activeChildren[0];
                let lastChild = activeChildren[activeChildren.length - 1];
                node.x = (firstChild.x + lastChild.x) / 2;
            }
        };

        assignCoords(rootNode, 0);
        this.renderRecursiveTrie(rootNode);
    }

    renderRecursiveTrie(node) {
        if (!node) return;
        
        for(let child of node.children) {
            if (child) {
                this.drawLine(node.x, node.y, child.x, child.y);
                this.renderRecursiveTrie(child);
            }
        }
        this.createNodeElement(node);
    }

    drawLine(x1, y1, x2, y2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1 + 25); 
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2 + 25);
        this.svgLayer.appendChild(line);
    }

    createNodeElement(node) {
        const div = document.createElement('div');
        div.className = 'node';
        if (node.isLeaf) div.classList.add('is-leaf');

        div.style.left = (node.x - 25) + 'px'; 
        div.style.top = (node.y) + 'px';
        div.id = `node-${node.id}`; 
        
        let displayVal = node.char === '*' ? 'root' : node.char;

        div.innerHTML = `<strong>${displayVal}</strong>`;
        this.nodesLayer.appendChild(div);
    }

    async highlight(nodeObj, className = 'highlight') {
        if (!nodeObj) return;
        const el = document.getElementById(`node-${nodeObj.id}`);
        if (el) {
            el.classList.add(className);
            // Auto-scroll to ensure the highlighted node is visible
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            
            await sleep(500);
            if (className !== 'found') {
                el.classList.remove(className);
            }
        }
    }
    
    clearHighlights() {
        const nodes = document.querySelectorAll('.node');
        nodes.forEach(n => n.classList.remove('found', 'highlight'));
    }
}

/**
 * MAIN CONTROLLER
 */
const visualizer = new TreeVisualizer();
const currentTree = new Trie(visualizer);

const inputVal = document.getElementById('node-value');
const btnInsert = document.getElementById('btn-insert');
const btnLookup = document.getElementById('btn-lookup');
const btnDelete = document.getElementById('btn-delete');
let processing = false;

async function executeAction(action) {
    if (processing) return;
    
    let rawVal = inputVal.value.trim();
    if (!rawVal) return;

    processing = true;
    setButtonsDisabled(true);
    
    try {
        await action(rawVal);
    } catch (e) {
        console.error(e);
        logger.add("Error: " + e.message);
    }

    processing = false;
    setButtonsDisabled(false);
    inputVal.value = '';
    inputVal.focus();
}

function setButtonsDisabled(state) {
    btnInsert.disabled = state;
    btnLookup.disabled = state;
    btnDelete.disabled = state;
}

btnInsert.addEventListener('click', () => executeAction(val => currentTree.insert(val)));
btnLookup.addEventListener('click', () => executeAction(val => currentTree.lookup(val)));
btnDelete.addEventListener('click', () => executeAction(val => currentTree.delete(val)));

inputVal.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') btnInsert.click();
});