// main.js
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
 * VISUALIZATION ENGINE
 */
class TreeVisualizer {
    constructor() {
        this.container = document.getElementById('nodes-layer');
        this.svgLayer = document.getElementById('svg-layer');
        this.containerWidth = document.getElementById('simulation-container').offsetWidth;
    }

    reset() {
        this.container.innerHTML = '';
        this.svgLayer.innerHTML = '';
    }

    draw(rootNode) {
        this.reset();
        if (!rootNode) return;
        // Check if Trie (children array) or Binary (left/right)
        if (rootNode.children) {
            this.drawTrie(rootNode);
        } else {
            this.drawBinary(rootNode);
        }
    }

    // --- BINARY TREE LAYOUT ---
    drawBinary(rootNode) {
        const calculatePositions = (node, x, y, level) => {
            if (!node) return;
            node.x = x;
            node.y = y;
            const offset = (this.containerWidth / Math.pow(2, level + 2)); 
            calculatePositions(node.left, x - offset, y + 80, level + 1);
            calculatePositions(node.right, x + offset, y + 80, level + 1);
        };

        calculatePositions(rootNode, this.containerWidth / 2, 50, 0);
        this.renderRecursiveBinary(rootNode);
    }

    renderRecursiveBinary(node) {
        if (!node) return;
        if (node.left) {
            this.drawLine(node.x, node.y, node.left.x, node.left.y);
            this.renderRecursiveBinary(node.left);
        }
        if (node.right) {
            this.drawLine(node.x, node.y, node.right.x, node.right.y);
            this.renderRecursiveBinary(node.right);
        }
        this.createNodeElement(node);
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
        const sectorWidth = this.containerWidth / totalLeaves;
        let currentLeafIndex = 0;

        const assignCoords = (node, level) => {
            if(!node) return;
            let activeChildren = node.children.filter(n => n !== null);
            node.y = 50 + (level * 70);

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
        this.createNodeElement(node, true);
    }

    drawLine(x1, y1, x2, y2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1 + 25); 
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2 + 25);
        this.svgLayer.appendChild(line);
    }

    createNodeElement(node, isTrie = false) {
        const div = document.createElement('div');
        div.className = 'node';
        if (isTrie && node.isLeaf) div.classList.add('is-leaf');

        div.style.left = (node.x - 25) + 'px'; 
        div.style.top = (node.y) + 'px';
        div.id = `node-${node.id}`; 
        
        let displayVal = node.value;
        if (isTrie) displayVal = node.char === '*' ? 'root' : node.char;

        div.innerHTML = `<strong>${displayVal}</strong>`;
        this.container.appendChild(div);
    }

    async highlight(nodeObj, className = 'highlight') {
        if (!nodeObj) return;
        const el = document.getElementById(`node-${nodeObj.id}`);
        if (el) {
            el.classList.add(className);
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

// === GENERIC NODE ===
class Node {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
        this.height = 1; 
        this.x = 0;
        this.y = 0;
        this.id = Math.random().toString(36).substr(2, 9);
    }
}

// === AVL TREE ===
class AVLTree {
    constructor(visualizer) {
        this.root = null;
        this.vis = visualizer;
    }
    getHeight(node) { return node ? node.height : 0; }
    updateHeight(node) {
        if (node) node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    }
    getBalance(node) { return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0; }

    rightRotate(y) {
        let x = y.left;
        let T2 = x.right;
        x.right = y;
        y.left = T2;
        this.updateHeight(y);
        this.updateHeight(x);
        return x;
    }

    leftRotate(x) {
        let y = x.right;
        let T2 = y.left;
        y.left = x;
        x.right = T2;
        this.updateHeight(x);
        this.updateHeight(y);
        return y;
    }

    async insert(value) {
        logger.add(`Insert ${value} ke AVL...`);
        this.root = await this._insert(this.root, value);
        this.vis.draw(this.root);
    }

    async _insert(node, value) {
        if (!node) return new Node(value);
        await this.vis.highlight(node);

        if (value < node.value) node.left = await this._insert(node.left, value);
        else if (value > node.value) node.right = await this._insert(node.right, value);
        else return node;

        this.updateHeight(node);
        let balance = this.getBalance(node);
        if (balance > 1 && value < node.left.value) return this.rightRotate(node);
        if (balance < -1 && value > node.right.value) return this.leftRotate(node);
        if (balance > 1 && value > node.left.value) {
            node.left = this.leftRotate(node.left);
            return this.rightRotate(node);
        }
        if (balance < -1 && value < node.right.value) {
            node.right = this.rightRotate(node.right);
            return this.leftRotate(node);
        }
        return node;
    }

    async delete(value) {
        this.root = await this._delete(this.root, value);
        this.vis.draw(this.root);
    }
    async _delete(node, value) {
        if (!node) return node;
        await this.vis.highlight(node);
        if (value < node.value) node.left = await this._delete(node.left, value);
        else if (value > node.value) node.right = await this._delete(node.right, value);
        else {
            if (!node.left || !node.right) {
                let temp = node.left ? node.left : node.right;
                if (!temp) node = null; else node = temp;
            } else {
                let temp = this.getMinValueNode(node.right);
                node.value = temp.value;
                node.right = await this._delete(node.right, temp.value);
            }
        }
        if (!node) return node;
        this.updateHeight(node);
        let balance = this.getBalance(node);
        if (balance > 1 && this.getBalance(node.left) >= 0) return this.rightRotate(node);
        if (balance > 1 && this.getBalance(node.left) < 0) {
            node.left = this.leftRotate(node.left);
            return this.rightRotate(node);
        }
        if (balance < -1 && this.getBalance(node.right) <= 0) return this.leftRotate(node);
        if (balance < -1 && this.getBalance(node.right) > 0) {
            node.right = this.rightRotate(node.right);
            return this.leftRotate(node);
        }
        return node;
    }
    getMinValueNode(node) {
        let current = node;
        while (current.left) current = current.left;
        return current;
    }
    async lookup(value) {
        this.vis.clearHighlights();
        let curr = this.root;
        while(curr) {
            await this.vis.highlight(curr);
            if(value == curr.value) {
                await this.vis.highlight(curr, 'found');
                return;
            }
            curr = value < curr.value ? curr.left : curr.right;
        }
        logger.add("Not Found.");
    }
}

// === MAX HEAP ===
class MaxHeap {
    constructor(visualizer) {
        this.vis = visualizer;
        this.heapNodes = []; 
    }
    buildTreeFromArray(index) {
        if (index >= this.heapNodes.length) return null;
        let nodeRef = this.heapNodes[index];
        nodeRef.left = this.buildTreeFromArray(2 * index + 1);
        nodeRef.right = this.buildTreeFromArray(2 * index + 2);
        return nodeRef;
    }
    updateView() {
        this.root = this.buildTreeFromArray(0);
        this.vis.draw(this.root);
    }
    async insert(value) {
        let newNode = new Node(value);
        this.heapNodes.push(newNode);
        this.updateView();
        await sleep(200);
        await this.heapifyUp(this.heapNodes.length - 1);
    }
    async heapifyUp(index) {
        if (index === 0) return;
        let parentIndex = Math.floor((index - 1) / 2);
        let current = this.heapNodes[index];
        let parent = this.heapNodes[parentIndex];
        await this.vis.highlight(current);
        await this.vis.highlight(parent);
        if (current.value > parent.value) {
            [this.heapNodes[index], this.heapNodes[parentIndex]] = [this.heapNodes[parentIndex], this.heapNodes[index]];
            this.updateView();
            await sleep(400);
            await this.heapifyUp(parentIndex);
        }
    }
    async delete(value) { 
        const index = this.heapNodes.findIndex(n => n.value === value);
        if (index === -1) return;
        let lastNode = this.heapNodes.pop();
        if (index < this.heapNodes.length) {
            this.heapNodes[index] = lastNode;
            this.updateView();
            let parentIndex = Math.floor((index - 1) / 2);
            if (index > 0 && this.heapNodes[index].value > this.heapNodes[parentIndex].value) {
                await this.heapifyUp(index);
            } else {
                await this.heapifyDown(index);
            }
        } else {
            this.updateView();
        }
    }
    async heapifyDown(index) {
        let largest = index;
        let left = 2 * index + 1;
        let right = 2 * index + 2;
        if (left < this.heapNodes.length && this.heapNodes[left].value > this.heapNodes[largest].value) largest = left;
        if (right < this.heapNodes.length && this.heapNodes[right].value > this.heapNodes[largest].value) largest = right;
        if (largest !== index) {
            [this.heapNodes[index], this.heapNodes[largest]] = [this.heapNodes[largest], this.heapNodes[index]];
            this.updateView();
            await sleep(400);
            await this.heapifyDown(largest);
        }
    }
    async lookup(value) {
        this.vis.clearHighlights();
        for(let node of this.heapNodes) {
            await this.vis.highlight(node);
            if (node.value == value) {
                await this.vis.highlight(node, 'found');
                return;
            }
        }
    }
}

// === SPLAY TREE ===
class SplayTree {
    constructor(visualizer) {
        this.root = null;
        this.vis = visualizer;
    }
    rightRotate(x) {
        let y = x.left;
        x.left = y.right;
        y.right = x;
        return y;
    }
    leftRotate(x) {
        let y = x.right;
        x.right = y.left;
        y.left = x;
        return y;
    }
    async splay(node, key) {
        if (!node || node.value === key) return node;
        await this.vis.highlight(node);
        if (key < node.value) {
            if (!node.left) return node;
            if (key < node.left.value) {
                node.left.left = await this.splay(node.left.left, key);
                node = this.rightRotate(node);
            } else if (key > node.left.value) {
                node.left.right = await this.splay(node.left.right, key);
                if (node.left.right) node.left = this.leftRotate(node.left);
            }
            if (!node.left) return node;
            return this.rightRotate(node);
        } else {
            if (!node.right) return node;
            if (key < node.right.value) {
                node.right.left = await this.splay(node.right.left, key);
                if (node.right.left) node.right = this.rightRotate(node.right);
            } else if (key > node.right.value) {
                node.right.right = await this.splay(node.right.right, key);
                node = this.leftRotate(node);
            }
            if (!node.right) return node;
            return this.leftRotate(node);
        }
    }
    async insert(value) {
        if (!this.root) {
            this.root = new Node(value);
            this.vis.draw(this.root);
            return;
        }
        this.root = await this.splay(this.root, value);
        this.vis.draw(this.root);
        if (this.root.value === value) return;
        let newNode = new Node(value);
        if (value < this.root.value) {
            newNode.right = this.root;
            newNode.left = this.root.left;
            this.root.left = null;
        } else {
            newNode.left = this.root;
            newNode.right = this.root.right;
            this.root.right = null;
        }
        this.root = newNode;
        this.vis.draw(this.root);
    }
    async lookup(value) {
        this.vis.clearHighlights();
        this.root = await this.splay(this.root, value);
        this.vis.draw(this.root);
        if (this.root && this.root.value == value) await this.vis.highlight(this.root, 'found');
    }
    async delete(value) {
        if (!this.root) return;
        this.root = await this.splay(this.root, value);
        this.vis.draw(this.root);
        if (this.root.value !== value) return;
        if (!this.root.left) {
            this.root = this.root.right;
        } else {
            let rightTree = this.root.right;
            this.root = this.root.left;
            this.root = await this.splay(this.root, value); 
            this.root.right = rightTree;
        }
        this.vis.draw(this.root);
    }
}

/**
 * MAIN CONTROLLER
 */
const visualizer = new TreeVisualizer();
let currentTree = new AVLTree(visualizer);

const selectTree = document.getElementById('tree-type');
const inputVal = document.getElementById('node-value');
const inputHint = document.getElementById('input-hint');
const btnInsert = document.getElementById('btn-insert');
const btnLookup = document.getElementById('btn-lookup');
const btnDelete = document.getElementById('btn-delete');
let processing = false;

selectTree.addEventListener('change', () => {
    visualizer.reset();
    logger.clear();
    const mode = selectTree.value;
    logger.add(`--- Mode berubah: ${mode} ---`);
    inputVal.value = '';
    
    switch(mode) {
        case 'AVL': 
            currentTree = new AVLTree(visualizer); 
            inputHint.innerText = "Masukkan angka integer.";
            break;
        case 'HEAP': 
            currentTree = new MaxHeap(visualizer); 
            inputHint.innerText = "Masukkan angka integer.";
            break;
        case 'SPLAY': 
            currentTree = new SplayTree(visualizer); 
            inputHint.innerText = "Masukkan angka integer.";
            break;
        case 'TRIE': 
            currentTree = new Trie(visualizer); 
            inputHint.innerText = "Masukkan string (a-z).";
            break;
    }
});

async function executeAction(action) {
    if (processing) return;
    
    let rawVal = inputVal.value.trim();
    if (!rawVal) return;

    let val;
    if (selectTree.value === 'TRIE') {
        val = rawVal;
    } else {
        val = parseInt(rawVal);
        if (isNaN(val)) {
            alert("Mode ini memerlukan input Angka!");
            return;
        }
    }

    processing = true;
    setButtonsDisabled(true);
    
    try {
        await action(val);
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