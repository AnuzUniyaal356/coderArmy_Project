// Global variables
let currentDate = new Date();
let selectedDate = null;
let goals = [];
let mindMapNodes = [];
let connections = [];
let isConnectingNodes = false;
let selectedNode = null;
let editingGoalId = null;

// DOM Elements
const goalInput = document.getElementById('goalInput');
const purposeInput = document.getElementById('purposeInput');
const addGoalBtn = document.getElementById('addGoalBtn');
const goalsList = document.getElementById('goalsList');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const currentMonthEl = document.getElementById('currentMonth');
const calendarDays = document.getElementById('calendarDays');
const mindMap = document.getElementById('mindMap');
const addNodeBtn = document.getElementById('addNodeBtn');
const connectNodesBtn = document.getElementById('connectNodesBtn');
const eventModal = document.getElementById('eventModal');
const closeModal = document.querySelector('.close');
const saveEventBtn = document.getElementById('saveEventBtn');


// Event Listeners
addGoalBtn.addEventListener('click', handleGoalSubmit);
prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));
addNodeBtn.addEventListener('click', addMindMapNode);
connectNodesBtn.addEventListener('click', toggleConnectNodes);
closeModal.addEventListener('click', () => eventModal.style.display = 'none');
saveEventBtn.addEventListener('click', saveEvent);
// Initialize
renderCalendar();
loadGoals();
loadMindMap();

// Goal Functions
function handleGoalSubmit() {
    if (!goalInput.value.trim()) return;

    if (editingGoalId) {
        updateGoal(editingGoalId);
    } else {
        addGoal();
    }
}

function addGoal() {
    const goal = {
        id: Date.now(),
        text: goalInput.value,
        purpose: purposeInput.value,
        completed: false,
        date: new Date()
    };

    goals.push(goal);
    saveGoals();
    renderGoals();
    clearGoalForm();
}

function updateGoal(id) {
    const goalIndex = goals.findIndex(g => g.id === id);
    if (goalIndex !== -1) {
        goals[goalIndex] = {
            ...goals[goalIndex],
            text: goalInput.value,
            purpose: purposeInput.value
        };
        saveGoals();
        renderGoals();
        clearGoalForm();
        editingGoalId = null;
        addGoalBtn.textContent = 'Add Goal';
    }
}

function editGoal(id) {
    const goal = goals.find(g => g.id === id);
    if (goal) {
        goalInput.value = goal.text;
        purposeInput.value = goal.purpose;
        editingGoalId = id;
        addGoalBtn.textContent = 'Update Goal';
        goalInput.focus();
    }
}

function clearGoalForm() {
    goalInput.value = '';
    purposeInput.value = '';
    editingGoalId = null;
    addGoalBtn.textContent = 'Add Goal';
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    currentMonthEl.textContent = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    let calendarHTML = '';

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = isSameDate(date, new Date());
        const events = getEventsForDate(date);

        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${events.length > 0 ? 'has-event' : ''}" 
                 onclick="selectDate(${year}, ${month}, ${day})">
                ${events.length > 0 ? `
                    <div class="event-preview">
                        ${events.map((event, index) => `
                            <div class="event-item">
                                <span>${event.title}</span>
                                <button class="btn-primary" onclick="deleteEvent(${index}, '${date.toISOString()}'); event.stopPropagation();">Delete</button>
                            </div>
                        `).join('')}
                    </div>` 
                : `${day}`}
            </div>
        `;
    }

    calendarDays.innerHTML = calendarHTML;
}


function deleteEvent(eventIndex, date) {
    let events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    const filteredEvents = events.filter(event => !isSameDate(new Date(event.date), new Date(date)));
    const eventsForDate = getEventsForDate(new Date(date));
    eventsForDate.splice(eventIndex, 1);

    // Combine the remaining events for the day and other dates
    localStorage.setItem('calendarEvents', JSON.stringify([...filteredEvents, ...eventsForDate]));
    renderCalendar();
}

function getEventsForDate(date) {
    const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    return events.filter(event => isSameDate(new Date(event.date), date));
}



function isSameDate(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    eventModal.style.display = 'block';
}

// Mind Map Functions
function addMindMapNode() {
    const nodeText = prompt('Enter node text:');
    if (!nodeText) return;

    const node = {
        id: Date.now(),
        text: nodeText,
        x: mindMap.clientWidth / 2,
        y: mindMap.clientHeight / 2,
        parentId: null
    };

    createMindMapNodeElement(node);
    mindMapNodes.push(node);
    saveMindMap();
}

function createMindMapNodeElement(node) {
    const nodeEl = document.createElement('div');
    nodeEl.className = 'mind-map-node';
    nodeEl.textContent = node.text;
    nodeEl.dataset.id = node.id;
    nodeEl.style.left = `${node.x}px`;
    nodeEl.style.top = `${node.y}px`;

    nodeEl.addEventListener('mousedown', handleNodeMouseDown);
    nodeEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showNodeContextMenu(node, e);
    });

    mindMap.appendChild(nodeEl);
}

function handleNodeMouseDown(e) {
    if (isConnectingNodes) {
        handleNodeConnection(e.target);
        return;
    }

    const node = e.target;
    const startX = e.clientX - node.offsetLeft;
    const startY = e.clientY - node.offsetTop;

    function moveNode(e) {
        const x = e.clientX - startX;
        const y = e.clientY - startY;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        updateConnections();
    }

    function stopMoving() {
        document.removeEventListener('mousemove', moveNode);
        document.removeEventListener('mouseup', stopMoving);
        
        // Save new position
        const nodeId = parseInt(node.dataset.id);
        const nodeData = mindMapNodes.find(n => n.id === nodeId);
        if (nodeData) {
            nodeData.x = parseInt(node.style.left);
            nodeData.y = parseInt(node.style.top);
            saveMindMap();
        }
    }

    document.addEventListener('mousemove', moveNode);
    document.addEventListener('mouseup', stopMoving);
}

function handleNodeConnection(node) {
    if (!selectedNode) {
        selectedNode = node;
        node.classList.add('selected');
    } else if (selectedNode !== node) {
        createConnection(selectedNode, node);
        selectedNode.classList.remove('selected');
        selectedNode = null;
    }
}

function createConnection(node1, node2) {
    const connection = {
        from: parseInt(node1.dataset.id),
        to: parseInt(node2.dataset.id)
    };

    connections.push(connection);
    drawConnection(node1, node2);
    saveMindMap();
}

function drawConnection(node1, node2) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'node-connection');
    
    svg.appendChild(line);
    mindMap.insertBefore(svg, mindMap.firstChild);
    
    updateConnectionLine(node1, node2, line);
}

function updateConnectionLine(node1, node2, line) {
    const rect1 = node1.getBoundingClientRect();
    const rect2 = node2.getBoundingClientRect();
    const mapRect = mindMap.getBoundingClientRect();
    
    const x1 = rect1.left - mapRect.left + rect1.width / 2;
    const y1 = rect1.top - mapRect.top + rect1.height / 2;
    const x2 = rect2.left - mapRect.left + rect2.width / 2;
    const y2 = rect2.top - mapRect.top + rect2.height / 2;
    
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
}

function updateConnections() {
    const svgs = mindMap.querySelectorAll('svg');
    svgs.forEach(svg => svg.remove());
    
    connections.forEach(conn => {
        const node1 = mindMap.querySelector(`[data-id="${conn.from}"]`);
        const node2 = mindMap.querySelector(`[data-id="${conn.to}"]`);
        if (node1 && node2) {
            drawConnection(node1, node2);
        }
    });
}

function showNodeContextMenu(node, event) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
        <button onclick="editNode(${node.id})">Edit</button>
        <button onclick="deleteNode(${node.id})">Delete</button>
    `;
    
    menu.style.position = 'absolute';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;
    
    document.body.appendChild(menu);
    
    function removeMenu() {
        menu.remove();
        document.removeEventListener('click', removeMenu);
    }
    
    setTimeout(() => {
        document.addEventListener('click', removeMenu);
    }, 0);
}

function editNode(id) {
    const node = mindMapNodes.find(n => n.id === id);
    if (node) {
        const newText = prompt('Edit node text:', node.text);
        if (newText) {
            node.text = newText;
            const nodeEl = mindMap.querySelector(`[data-id="${id}"]`);
            if (nodeEl) {
                nodeEl.textContent = newText;
            }
            saveMindMap();
        }
    }
}

function deleteNode(id) {
    if (confirm('Are you sure you want to delete this node?')) {
        mindMapNodes = mindMapNodes.filter(n => n.id !== id);
        connections = connections.filter(c => c.from !== id && c.to !== id);
        const nodeEl = mindMap.querySelector(`[data-id="${id}"]`);
        if (nodeEl) {
            nodeEl.remove();
        }
        updateConnections();
        saveMindMap();
    }
}

function toggleConnectNodes() {
    isConnectingNodes = !isConnectingNodes;
    connectNodesBtn.classList.toggle('active');
    if (!isConnectingNodes && selectedNode) {
        selectedNode.classList.remove('selected');
        selectedNode = null;
    }
}

// Storage Functions
function saveGoals() {
    localStorage.setItem('writingGoals', JSON.stringify(goals));
}

function loadGoals() {
    const savedGoals = localStorage.getItem('writingGoals');
    if (savedGoals) {
        goals = JSON.parse(savedGoals);
        goals.forEach(goal => goal.date = new Date(goal.date));
        renderGoals();
    }
}

function saveMindMap() {
    localStorage.setItem('mindMapNodes', JSON.stringify(mindMapNodes));
    localStorage.setItem('mindMapConnections', JSON.stringify(connections));
}

function loadMindMap() {
    const savedNodes = localStorage.getItem('mindMapNodes');
    const savedConnections = localStorage.getItem('mindMapConnections');
    
    if (savedNodes) {
        mindMapNodes = JSON.parse(savedNodes);
        mindMapNodes.forEach(node => createMindMapNodeElement(node));
    }
    
    if (savedConnections) {
        connections = JSON.parse(savedConnections);
        connections.forEach(conn => {
            const node1 = mindMap.querySelector(`[data-id="${conn.from}"]`);
            const node2 = mindMap.querySelector(`[data-id="${conn.to}"]`);
            if (node1 && node2) {
                drawConnection(node1, node2);
            }
        });
    }
}

// Event Functions
function saveEvent() {
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    
    if (!title) return;
    
    const event = {
        date: selectedDate,
        title,
        description
    };
    
    const events = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    events.push(event);
    localStorage.setItem('calendarEvents', JSON.stringify(events));
    
    eventModal.style.display = 'none';
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventDescription').value = '';
    renderCalendar();
}


