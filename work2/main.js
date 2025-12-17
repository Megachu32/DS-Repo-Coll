import { Trie } from './trie.js';

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
    clear: function() { this.area.innerHTML = ''; }
};

class TreeVisualizer {
    constructor() {
        this.nodesLayer = document.getElementById('nodes-layer');
        this.svgLayer = document.getElementById('svg-layer');
        this.scrollWindow = document.getElementById('simulation-container');
    }

    reset() {
        this.nodesLayer.innerHTML = '';
        this.svgLayer.innerHTML = '';
        this.nodesLayer.style.width = '100%';
        this.svgLayer.style.width = '100%';
    }

    draw(rootNode) {
        this.reset();
        if (!rootNode) return;
        this.drawTrie(rootNode);
    }

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
        const visibleWidth = this.scrollWindow.offsetWidth;
        const minWidthPerLeaf = 60;
        const requiredWidth = totalLeaves * minWidthPerLeaf;
        const effectiveWidth = Math.max(visibleWidth, requiredWidth);

        this.nodesLayer.style.width = `${effectiveWidth}px`;
        this.svgLayer.style.width = `${effectiveWidth}px`;

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
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            await sleep(500);
            if (className !== 'found') el.classList.remove(className);
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
const suggestionsBox = document.getElementById('suggestions-box');
const btnInsert = document.getElementById('btn-insert');
const btnLookup = document.getElementById('btn-lookup');
const btnDelete = document.getElementById('btn-delete');
let processing = false;

// --- NEW: Handle Autocomplete Logic ---
function updateSuggestions(text) {
    if(!text || text.length === 0) {
        suggestionsBox.innerHTML = '<span class="suggestion-label">Type to see predictions...</span>';
        return;
    }
    
    // Call the synchronous findWords method
    const words = currentTree.findWords(text);
    
    suggestionsBox.innerHTML = '';
    if(words.length === 0) {
        suggestionsBox.innerHTML = '<span class="suggestion-label">No matches found.</span>';
        return;
    }

    suggestionsBox.innerHTML = '<span class="suggestion-label">Did you mean:</span>';
    
    words.forEach(word => {
        const chip = document.createElement('div');
        chip.className = 'suggestion-chip';
        chip.innerText = word;
        chip.onclick = () => {
            inputVal.value = word; // Autocomplete on click
            updateSuggestions(word);
        };
        suggestionsBox.appendChild(chip);
    });
}

// Input Event for typing
inputVal.addEventListener('input', (e) => {
    updateSuggestions(e.target.value.trim());
});

async function executeAction(action) {
    if (processing) return;
    let rawVal = inputVal.value.trim();
    if (!rawVal) return;

    processing = true;
    setButtonsDisabled(true);
    
    try {
        await action(rawVal);
        // Update suggestions after action (e.g. inserting new word)
        updateSuggestions(inputVal.value);
    } catch (e) {
        console.error(e);
        logger.add("Error: " + e.message);
    }

    processing = false;
    setButtonsDisabled(false);
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