document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    // Game Management
    const gameNameInput = document.getElementById('game-name');
    const addGameBtn = document.getElementById('add-game-btn');
    const selectGameDropdown = document.getElementById('select-game');
    const deleteGameBtn = document.getElementById('delete-game-btn');

    // Customer Management
    const customerNameInput = document.getElementById('customer-name');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const selectCustomerDropdown = document.getElementById('select-customer');
    const deleteCustomerBtn = document.getElementById('delete-customer-btn');

    // Number Entry
    const numberInput = document.getElementById('number-input');
    const singleDigitInput = document.getElementById('single-digit-input');
    const amountInput = document.getElementById('amount-input');
    const addBetBtn = document.getElementById('add-bet-btn');

    // Betting Grid
    const bettingGridBody = document.getElementById('betting-grid').querySelector('tbody');

    // Customer Summary
    const summaryGameFilter = document.getElementById('summary-game-filter');
    const summaryCustomerFilter = document.getElementById('summary-customer-filter'); // New filter
    const deleteSummaryBtn = document.getElementById('delete-summary-btn'); // New delete button
    const customerSummaryBody = document.getElementById('customer-summary').querySelector('tbody');
    const summaryDateFilter = document.getElementById('summary-date-filter'); // Date picker

    // Grid Filters
    const gridDateFilter = document.getElementById('grid-date-filter');
    const gridGameFilter = document.getElementById('grid-game-filter');
    const gridCustomerFilter = document.getElementById('grid-customer-filter');
    const gridDeleteAllBtn = document.getElementById('grid-delete-all-btn'); // Grid delete all button

    // Modal Elements
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // --- State Variables ---
    let games = [];
    let customers = [];
    let bets = []; // We might need a more structured way to store bets later
    let lastFocusedNumberInput = numberInput; // Track last used number input

    // Add pagination variables
    let currentPage = 1;
    const rowsPerPage = 10;
    let summaryData = []; // Store all summary data

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    summaryDateFilter.value = today;

    // --- Function Definitions ---

    // Function to fetch games from the server
    async function fetchGames() {
        try {
            const response = await fetch('/api/games');
            if (!response.ok) throw new Error('Failed to fetch games');
            games = await response.json();
            populateGameDropdowns();
        } catch (error) {
            console.error('Error fetching games:', error);
            alert('Could not load games.');
        }
    }

    // Function to fetch customers from the server
    async function fetchCustomers() {
        try {
            const response = await fetch('/api/customers');
            if (!response.ok) throw new Error('Failed to fetch customers');
            customers = await response.json();
            populateCustomerDropdown();
        } catch (error) {
            console.error('Error fetching customers:', error);
            alert('Could not load customers.');
        }
    }

    // Function to fetch bets based on current selections
    async function fetchBetsForCurrentSelection() {
        const gameId = selectGameDropdown.value;
        const customerId = selectCustomerDropdown.value;

        // Only fetch if both a game and customer are selected
        if (!gameId || !customerId) {
            console.log("Game or Customer not selected, clearing bets.");
            bets = []; // Clear local bets array
            populateBettingGrid(); // Clear the grid display
            return; // Don't fetch
        }

        const filters = { gameId, customerId };
        console.log("Fetching bets for selection:", filters);
        const queryParams = new URLSearchParams(filters).toString();
        const url = `/api/bets?${queryParams}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch bets');
            bets = await response.json(); // Update the global bets array
            console.log("Fetched bets:", bets);
            populateBettingGrid(); // Populate grid with fetched data
        } catch (error) {
            console.error('Error fetching bets:', error);
            alert('Could not load bet data for the current selection.');
            bets = []; // Clear bets on error
            populateBettingGrid(); // Clear grid display on error
        }
    }

    // Function to populate game dropdowns
    function populateGameDropdowns() {
        // Clear existing options (except the default)
        selectGameDropdown.innerHTML = '<option value="">Select a game</option>';
        summaryGameFilter.innerHTML = '<option value="all">All Games</option>';
        deleteGameBtn.disabled = true; // Disable button immediately after clearing

        games.forEach(game => {
            const option1 = document.createElement('option');
            option1.value = game.id;
            option1.textContent = game.name;
            selectGameDropdown.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = game.id;
            option2.textContent = game.name;
            summaryGameFilter.appendChild(option2);
        });
        // Ensure button is disabled after population if default option is selected
        deleteGameBtn.disabled = !selectGameDropdown.value;
    }

    // Function to populate customer dropdown
    function populateCustomerDropdown() {
        // Clear existing options (except the default)
        selectCustomerDropdown.innerHTML = '<option value="">Select a customer</option>';
        summaryCustomerFilter.innerHTML = '<option value="all">All Customers</option>';
        deleteCustomerBtn.disabled = true; // Disable button immediately after clearing

        // Create an array for summary filter options to avoid duplicates
        const summaryOptions = new Set();

        customers.forEach(customer => {
            // Add to main selection dropdown
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            selectCustomerDropdown.appendChild(option);

            // Add to summary filter dropdown (using Set to avoid duplicates)
            if (!summaryOptions.has(customer.id)) {
                summaryOptions.add(customer.id);
                const summaryOption = document.createElement('option');
                summaryOption.value = customer.id;
                summaryOption.textContent = customer.name;
                summaryCustomerFilter.appendChild(summaryOption);
            }
        });
        // Ensure button is disabled after population if default option is selected
        deleteCustomerBtn.disabled = !selectCustomerDropdown.value;
    }

    // Function to generate the betting grid structure AND populate it
    function populateBettingGrid() {
        bettingGridBody.innerHTML = '';

        // SD Row (Single Digit)
        const sdRow = bettingGridBody.insertRow();
        const sdHeaderCell = sdRow.insertCell();
        sdHeaderCell.outerHTML = '<th>SD</th>';
        for (let i = 0; i < 10; i++) {
            const cell = sdRow.insertCell();
            cell.id = `grid-sd-${i}`;
            cell.innerHTML = `<span class="cell-amount"></span>`; // No number display for SD
        }

        // DD Rows (Double Digit 00-99)
        for (let i = 0; i < 10; i++) {
            const row = bettingGridBody.insertRow();
            const headerCell = row.insertCell();
            headerCell.outerHTML = `<th>${i}</th>`;
            for (let j = 0; j < 10; j++) {
                const cell = row.insertCell();
                const number = `${i}${j}`;
                cell.id = `grid-dd-${number}`;
                cell.innerHTML = `<span class="cell-number"></span><span class="cell-amount"></span>`;
            }
        }

        // Populate Grid with Bet Data
        console.log("Populating grid with bets:", bets);
        bets.forEach(bet => {
            const cellId = bet.bet_type === 'SD'
                ? `grid-sd-${bet.number}`
                : `grid-dd-${bet.number.padStart(2, '0')}`;
            const cell = document.getElementById(cellId);
            if (cell) {
                // Show the number only for DD bets
                if (bet.bet_type === 'DD') {
                    const numberSpan = cell.querySelector('.cell-number');
                    numberSpan.textContent = bet.number;
                }
                
                const amountSpan = cell.querySelector('.cell-amount');
                const currentAmount = parseFloat(amountSpan.textContent) || 0;
                amountSpan.textContent = currentAmount + bet.amount;
            } else {
                console.warn(`Cell with ID ${cellId} not found for bet:`, bet);
            }
        });
        console.log("Betting grid populated.");
    }

    // Separate function to populate grid with specific bets
    function populateBettingGridWithData(gridBets) {
        bettingGridBody.innerHTML = '';

        // SD Row (Single Digit)
        const sdRow = bettingGridBody.insertRow();
        const sdHeaderCell = sdRow.insertCell();
        sdHeaderCell.outerHTML = '<th>SD</th>';
        for (let i = 0; i < 10; i++) {
            const cell = sdRow.insertCell();
            cell.id = `grid-sd-${i}`;
            cell.innerHTML = `<span class="cell-amount"></span>`; // No number display for SD
        }

        // DD Rows (Double Digit 00-99)
        for (let i = 0; i < 10; i++) {
            const row = bettingGridBody.insertRow();
            const headerCell = row.insertCell();
            headerCell.outerHTML = `<th>${i}</th>`;
            for (let j = 0; j < 10; j++) {
                const cell = row.insertCell();
                const number = `${i}${j}`;
                cell.id = `grid-dd-${number}`;
                cell.innerHTML = `<span class="cell-number"></span><span class="cell-amount"></span>`;
            }
        }

        // Populate Grid with Bet Data
        console.log("Populating grid with bets:", gridBets);
        gridBets.forEach(bet => {
            const cellId = bet.bet_type === 'SD'
                ? `grid-sd-${bet.number}`
                : `grid-dd-${bet.number.padStart(2, '0')}`;
            const cell = document.getElementById(cellId);
            if (cell) {
                // Show the number only for DD bets
                if (bet.bet_type === 'DD') {
                    const numberSpan = cell.querySelector('.cell-number');
                    numberSpan.textContent = bet.number;
                }
                
                const amountSpan = cell.querySelector('.cell-amount');
                const currentAmount = parseFloat(amountSpan.textContent) || 0;
                amountSpan.textContent = currentAmount + bet.amount;
            } else {
                console.warn(`Cell with ID ${cellId} not found for bet:`, bet);
            }
        });
        console.log("Betting grid populated.");
    }

    // Function to update the button states
    function updateDeleteButtonState(hasData) {
        const deleteBtn = document.getElementById('delete-summary-btn');
        const downloadBtn = document.getElementById('download-summary-btn');
        
        [deleteBtn, downloadBtn].forEach(btn => {
            if (!hasData) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
    }

    // Function to fetch and update the customer summary table
    async function updateCustomerSummary() {
        const selectedGameId = summaryGameFilter.value;
        const selectedCustomerId = summaryCustomerFilter.value;
        const date = summaryDateFilter.value || today;

        const queryParams = new URLSearchParams();
        if (selectedGameId !== 'all') queryParams.append('gameId', selectedGameId);
        if (selectedCustomerId !== 'all') queryParams.append('customerId', selectedCustomerId);
        queryParams.append('date', date);

        try {
            const response = await fetch(`/api/summary?${queryParams.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch summary');
            summaryData = await response.json(); // Store all data
            console.log("Fetched summary data:", summaryData);

            // Reset to first page when data changes
            currentPage = 1;
            updatePaginationControls();
            displayCurrentPage();

        } catch (error) {
            console.error('Error updating customer summary:', error);
            alert('Could not update customer summary.');
            summaryData = [];
            displayCurrentPage();
        }
    }

    // Function to update pagination controls
    function updatePaginationControls() {
        const totalPages = Math.ceil(summaryData.length / rowsPerPage);
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    // Function to display current page
    function displayCurrentPage() {
        const startIdx = (currentPage - 1) * rowsPerPage;
        const endIdx = startIdx + rowsPerPage;
        const currentPageData = summaryData.slice(startIdx, endIdx);

        // Update delete button state based on whether there's any data
        updateDeleteButtonState(summaryData.length > 0);

        // Clear existing summary rows (keep the header)
        let totalRow = customerSummaryBody.querySelector('tr:last-child');
        if (totalRow && totalRow.cells[0].textContent !== 'Total') {
            totalRow = null;
        }
        while (customerSummaryBody.firstChild && customerSummaryBody.firstChild !== totalRow) {
            customerSummaryBody.removeChild(customerSummaryBody.firstChild);
        }
        if (totalRow) {
            totalRow.cells[2].textContent = '₹ 0';
        }

        let grandTotal = 0;
        currentPageData.forEach(item => {
            const row = customerSummaryBody.insertBefore(document.createElement('tr'), totalRow);
            row.insertCell().textContent = item.customer_name;
            row.insertCell().textContent = item.game_name;
            const amountCell = row.insertCell();
            amountCell.textContent = `₹ ${item.total_amount.toFixed(2)}`;
            amountCell.style.textAlign = 'right';
            grandTotal += item.total_amount;
        });

        // Calculate grand total for ALL data, not just current page
        const totalAmount = summaryData.reduce((sum, item) => sum + item.total_amount, 0);

        // Ensure the Total row exists and update it
        if (!totalRow) {
            totalRow = customerSummaryBody.insertRow();
            totalRow.insertCell().textContent = 'Total';
            totalRow.insertCell(); // Empty cell for game column
            const totalAmountCell = totalRow.insertCell();
            totalAmountCell.id = 'summary-total';
            totalAmountCell.style.fontWeight = 'bold';
            totalAmountCell.style.borderTop = '2px solid #343a40';
            totalRow.cells[0].style.borderTop = '2px solid #343a40';
            totalRow.cells[1].style.borderTop = '2px solid #343a40';
        }
        const finalTotalCell = document.getElementById('summary-total');
        finalTotalCell.textContent = `₹ ${totalAmount.toFixed(2)}`;
        finalTotalCell.style.textAlign = 'right';
    }

    // Function to handle downloading summary data as CSV
    function downloadSummaryAsCSV() {
        // Add only column headers with rupee symbol in Total Amount
        let csvContent = 'Customer,Game,Amount(₹)\n\n';

        // Add all data rows (without rupee symbol since it's in the header)
        summaryData.forEach(item => {
            csvContent += `${item.customer_name},${item.game_name},${item.total_amount.toFixed(2)}\n`;
        });

        // Add grand total (without rupee symbol)
        const totalAmount = summaryData.reduce((sum, item) => sum + item.total_amount, 0);
        csvContent += `\nTotal Amount =====> ${totalAmount.toFixed(2)}\n`;

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // Use the selected date from the date picker, or today if no date is selected
        const selectedDate = summaryDateFilter.value || new Date().toISOString().split('T')[0];
        const filename = `customer_summary_${selectedDate}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Add event listener for download button
    document.getElementById('download-summary-btn').addEventListener('click', downloadSummaryAsCSV);

    // Add event listeners for pagination buttons
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updatePaginationControls();
            displayCurrentPage();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(summaryData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updatePaginationControls();
            displayCurrentPage();
        }
    });

    // --- Modal Handling Functions ---
    function showModal(message) {
        modalMessage.textContent = message || 'Are you sure?'; // Default message
        confirmationModal.style.display = 'block';
    }

    function hideModal() {
        confirmationModal.style.display = 'none';
    }

    function showSuccessModal(modalId, message) {
        const modal = document.getElementById(modalId);
        const messageElement = modal.querySelector('p');
        const okButton = modal.querySelector('.ok-button');
        
        messageElement.textContent = message;
        modal.style.display = 'block';
        
        // Remove any existing event listeners
        const newOkButton = okButton.cloneNode(true);
        okButton.parentNode.replaceChild(newOkButton, okButton);
        
        // Add click handler for OK button
        newOkButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Close on click outside
        window.addEventListener('click', function closeOutside(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
                window.removeEventListener('click', closeOutside);
            }
        });
    }

    function showValidationModal(message) {
        const modal = document.getElementById('validation-modal');
        const messageElement = modal.querySelector('#validation-message');
        const okButton = modal.querySelector('.ok-button');
        
        messageElement.textContent = message;
        modal.style.display = 'block';
        
        // Remove any existing event listeners
        const newOkButton = okButton.cloneNode(true);
        okButton.parentNode.replaceChild(newOkButton, okButton);
        
        // Add click handler for OK button
        newOkButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Function to handle the deletion confirmation
    async function handleSummaryDelete() {
        const gameId = summaryGameFilter.value;
        const customerId = summaryCustomerFilter.value;
        const date = summaryDateFilter.value;

        // Prepare confirmation message - Allow all/all case now
        let confirmMsg = `Are you sure you want to delete bets?`; // Default start
        if (gameId === 'all' && customerId === 'all' && !date) {
            confirmMsg = `Are you sure you want to delete ALL bets for ALL customers and ALL games? This cannot be undone.`;
        } else if (customerId !== 'all') {
            const custName = customers.find(c => c.id == customerId)?.name || `Customer ID ${customerId}`;
            confirmMsg = `Are you sure you want to delete bets for customer "${custName}"`;
            if (gameId !== 'all') {
                const gameName = games.find(g => g.id == gameId)?.name || `Game ID ${gameId}`;
                confirmMsg += ` in game "${gameName}"`;
            } else {
                confirmMsg += ` across all games`;
            }
            if (date) {
                confirmMsg += ` on ${date}`;
            }
            confirmMsg += '?';
        } else { // customerId is 'all', so gameId must be specific (gameId !== 'all')
            const gameName = games.find(g => g.id == gameId)?.name || `Game ID ${gameId}`;
            confirmMsg = `Are you sure you want to delete bets for all customers in game "${gameName}"?`;
            if (date) {
                confirmMsg += ` on ${date}`;
            }
        }

        const confirmAction = async () => {
            modalConfirmBtn.removeEventListener('click', confirmAction);
            modalCancelBtn.removeEventListener('click', cancelAction);
            hideModal();
            console.log(`Proceeding with delete for gameId: ${gameId}, customerId: ${customerId}, date: ${date}`);

            try {
                const queryParams = new URLSearchParams({ gameId, customerId, date }).toString();
                const response = await fetch(`/api/bets?${queryParams}`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to delete bets');
                }

                // Show success modal instead of alert
                showSuccessModal('delete-success-modal', result.message || 'Bets deleted successfully.');

                // Update the grid with current filters
                await updateBettingGrid();
                
                // Update customer summary
                await updateCustomerSummary();

            } catch (error) {
                console.error("Error deleting bets:", error);
                alert(`Could not delete bets: ${error.message}`);
            }
        };

        const cancelAction = () => {
            modalConfirmBtn.removeEventListener('click', confirmAction);
            modalCancelBtn.removeEventListener('click', cancelAction);
            hideModal();
            console.log("Delete cancelled.");
        };

        modalConfirmBtn.addEventListener('click', confirmAction);
        modalCancelBtn.addEventListener('click', cancelAction);
        showModal(confirmMsg);
    }

    // Function to handle adding a new game
    async function handleAddGame() {
        const name = gameNameInput.value.trim();
        if (!name) {
            alert('Please enter a game name.');
            return;
        }
        try {
            const response = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add game');
            }

            const newGame = await response.json();
            games.push(newGame);
            populateGameDropdowns();
            gameNameInput.value = '';
            showSuccessModal('game-success-modal', `Game "${name}" added successfully!`);
        } catch (error) {
            console.error('Error adding game:', error);
            alert(error.message || 'Could not add game.');
        }
    }

    // Function to handle adding a new customer
    async function handleAddCustomer() {
        const name = customerNameInput.value.trim();
        if (!name) {
            alert('Please enter a customer name.');
            return;
        }
        try {
            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add customer');
            }

            const newCustomer = await response.json();
            customers.push(newCustomer);
            populateCustomerDropdown();
            customerNameInput.value = '';
            showSuccessModal('customer-success-modal', `Customer "${name}" added successfully!`);
        } catch (error) {
            console.error('Error adding customer:', error);
            alert(error.message || 'Could not add customer.');
        }
    }

    // Function to handle deleting a game
    async function handleDeleteGame() {
        const gameId = selectGameDropdown.value;
        if (!gameId) return; // Should not happen if button is enabled correctly

        const gameName = games.find(g => g.id == gameId)?.name || `Game ID ${gameId}`;
        const confirmMsg = `Are you sure you want to delete the game "${gameName}"? This might also delete associated bets.`;

        const confirmAction = async () => {
            modalConfirmBtn.removeEventListener('click', confirmAction);
            modalCancelBtn.removeEventListener('click', cancelAction);
            hideModal();
            console.log(`Proceeding with delete for game ID: ${gameId}`);

            try {
                const response = await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to delete game');
                }

                showSuccessModal('delete-success-modal', result.message || 'Game deleted successfully.');
                await fetchGames(); // Refresh game dropdowns
                // Optionally clear other related data if needed
                selectGameDropdown.value = ''; // Reset dropdown
                deleteGameBtn.disabled = true; // Disable button again
                await fetchBetsForCurrentSelection(); // Refresh grid if selection changed
                await updateCustomerSummary(); // Refresh summary

            } catch (error) {
                console.error("Error deleting game:", error);
                alert(`Could not delete game: ${error.message}`);
            }
        };

        const cancelAction = () => {
            modalConfirmBtn.removeEventListener('click', confirmAction);
            modalCancelBtn.removeEventListener('click', cancelAction);
            hideModal();
            console.log("Game delete cancelled.");
        };

        modalConfirmBtn.addEventListener('click', confirmAction);
        modalCancelBtn.addEventListener('click', cancelAction);
        showModal(confirmMsg);
    }

    // Function to handle deleting a customer
    async function handleDeleteCustomer() {
        const customerId = selectCustomerDropdown.value;
        if (!customerId) return; // Should not happen

        const customerName = customers.find(c => c.id == customerId)?.name || `Customer ID ${customerId}`;
        const confirmMsg = `Are you sure you want to delete the customer "${customerName}"? This might also delete associated bets.`;

        const confirmAction = async () => {
            modalConfirmBtn.removeEventListener('click', confirmAction);
            modalCancelBtn.removeEventListener('click', cancelAction);
            hideModal();
            console.log(`Proceeding with delete for customer ID: ${customerId}`);

            try {
                const response = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to delete customer');
                }

                showSuccessModal('delete-success-modal', result.message || 'Customer deleted successfully.');
                await fetchCustomers(); // Refresh customer dropdowns
                selectCustomerDropdown.value = ''; // Reset dropdown
                deleteCustomerBtn.disabled = true; // Disable button again
                await fetchBetsForCurrentSelection(); // Refresh grid if selection changed
                await updateCustomerSummary(); // Refresh summary

            } catch (error) {
                console.error("Error deleting customer:", error);
                alert(`Could not delete customer: ${error.message}`);
            }
        };

        const cancelAction = () => {
            modalConfirmBtn.removeEventListener('click', confirmAction);
            modalCancelBtn.removeEventListener('click', cancelAction);
            hideModal();
            console.log("Customer delete cancelled.");
        };

        modalConfirmBtn.addEventListener('click', confirmAction);
        modalCancelBtn.addEventListener('click', cancelAction);
        showModal(confirmMsg);
    }

    // Function to handle adding a new bet
    async function handleAddBet() {
        const gameId = selectGameDropdown.value;
        const customerId = selectCustomerDropdown.value;
        const numberStr = numberInput.value.trim();
        const singleDigitStr = singleDigitInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (!gameId || !customerId) {
            showValidationModal('Please select both a game and a customer before placing a bet.');
            return;
        }
        if (!numberStr && !singleDigitStr) {
            showValidationModal('Please enter a number (00-99) or a single digit (0-9).');
            return;
        }
        if (numberStr && singleDigitStr) {
            showValidationModal('Please enter either a number (00-99) OR a single digit (0-9), not both.');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showValidationModal('Please enter a valid positive amount.');
            return;
        }

        let betType, numberValue;
        if (numberStr) {
            if (!/^\d{1,2}$/.test(numberStr) || parseInt(numberStr) < 0 || parseInt(numberStr) > 99) {
                showValidationModal('Invalid number. Please enter a value between 00 and 99.');
                return;
            }
            betType = 'DD'; // Double Digit
            numberValue = numberStr.padStart(2, '0'); // Ensure two digits
            lastFocusedNumberInput = numberInput; // Remember this was the last used input
        } else { // singleDigitStr must have value here
            if (!/^\d$/.test(singleDigitStr)) {
                showValidationModal('Invalid single digit. Please enter a value between 0 and 9.');
                return;
            }
            betType = 'SD'; // Single Digit
            numberValue = singleDigitStr;
            lastFocusedNumberInput = singleDigitInput; // Remember this was the last used input
        }

        const betData = {
            gameId,
            customerId,
            betType,
            number: numberValue,
            amount,
            betDate: summaryDateFilter.value
        };

        try {
            const response = await fetch('/api/bets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(betData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add bet');
            }
            const newBet = await response.json();
            console.log('Bet added successfully:', newBet);

            // Update grid based on its own filters
            await updateBettingGrid();
            // Update customer summary
            await updateCustomerSummary();

            // Clear inputs and refocus
            numberInput.value = '';
            singleDigitInput.value = '';
            amountInput.value = '';
            lastFocusedNumberInput.focus();

        } catch (error) {
            console.error('Error adding bet:', error);
            alert(`Could not add bet: ${error.message}`);
        }
    }

    // Function to update the betting grid based on filters
    async function updateBettingGrid() {
        const selectedDate = gridDateFilter.value;
        const selectedGame = gridGameFilter.value;
        const selectedCustomer = gridCustomerFilter.value;

        try {
            const response = await fetch('/api/bets/grid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date: selectedDate,
                    game: selectedGame,
                    customer: selectedCustomer
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch betting grid data');
            }

            const data = await response.json();
            // Don't update the global bets array, create a separate gridBets array
            const gridBets = data;
            // Create a separate function to populate grid with specific bets
            populateBettingGridWithData(gridBets);
        } catch (error) {
            console.error('Error updating betting grid:', error);
            populateBettingGridWithData([]); // Clear the grid on error
        }
    }

    // Function to populate dropdowns including grid filters
    async function populateDropdowns() {
        try {
            // Populate game and customer dropdowns
            populateGameDropdowns();
            populateCustomerDropdown();

            // Populate grid filters
            const gridGameFilter = document.getElementById('grid-game-filter');
            const gridCustomerFilter = document.getElementById('grid-customer-filter');
            
            // Clear existing options except "All" option
            while (gridGameFilter.options.length > 1) gridGameFilter.remove(1);
            while (gridCustomerFilter.options.length > 1) gridCustomerFilter.remove(1);

            // Add games to grid filter
            games.forEach(game => {
                const option = document.createElement('option');
                option.value = game.id; // Changed to use ID
                option.textContent = game.name;
                gridGameFilter.appendChild(option);
            });

            // Add customers to grid filter
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id; // Changed to use ID
                option.textContent = customer.name;
                gridCustomerFilter.appendChild(option);
            });

            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            gridDateFilter.value = today;

            // Initial grid update
            updateBettingGrid();
        } catch (error) {
            console.error('Error populating dropdowns:', error);
        }
    }

    // Function to handle grid delete all
    async function handleGridDeleteAll() {
        const confirmMsg = 'Are you sure you want to delete ALL bets, customers, and games? This action cannot be undone.';

        const confirmAction = async () => {
            modalConfirmBtn.removeEventListener('click', confirmAction);
            modalCancelBtn.removeEventListener('click', cancelAction);
            hideModal();

            try {
                // Send delete request with all=true to indicate complete deletion
                const response = await fetch('/api/bets?gameId=all&customerId=all', {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to delete data');
                }

                showSuccessModal('delete-success-modal', 'All data has been deleted successfully.');

                // Reset all dropdowns and refresh data
                await fetchGames();
                await fetchCustomers();
                await populateDropdowns();
                await updateCustomerSummary();
                await updateBettingGrid();

                // Reset main selections
                selectGameDropdown.value = '';
                selectCustomerDropdown.value = '';
                deleteGameBtn.disabled = true;
                deleteCustomerBtn.disabled = true;

            } catch (error) {
                console.error("Error deleting all data:", error);
                alert(`Could not delete data: ${error.message}`);
            }
        };

        const cancelAction = () => {
            modalConfirmBtn.removeEventListener('click', confirmAction);
            modalCancelBtn.removeEventListener('click', cancelAction);
            hideModal();
        };

        modalConfirmBtn.addEventListener('click', confirmAction);
        modalCancelBtn.addEventListener('click', cancelAction);
        showModal(confirmMsg);
    }

    // --- Event Listeners ---
    addGameBtn.addEventListener('click', handleAddGame);
    deleteGameBtn.addEventListener('click', handleDeleteGame); // Add listener for game delete
    addCustomerBtn.addEventListener('click', handleAddCustomer);
    deleteCustomerBtn.addEventListener('click', handleDeleteCustomer); // Add listener for customer delete
    addBetBtn.addEventListener('click', handleAddBet);

    // Add Enter key listeners for convenience
    gameNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddGame();
    });
    customerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddCustomer();
    });

    // Focus logic: Move from number/digit input to amount input on entry
    numberInput.addEventListener('input', () => {
        const value = numberInput.value.trim();
        if (value) {
            singleDigitInput.value = ''; // Clear the other input
            // Only focus amount if 2 digits are entered
            if (value.length >= 2) {
                // Optional: truncate to 2 digits if needed
                if (value.length > 2) numberInput.value = value.substring(0, 2);
                amountInput.focus();
            }
        }
    });
    singleDigitInput.addEventListener('input', () => {
        const value = singleDigitInput.value.trim();
        if (value) {
            numberInput.value = ''; // Clear the other input
            // Optional: truncate to 1 digit if needed
            if (value.length > 1) singleDigitInput.value = value.substring(0, 1);
            // Focus amount immediately for single digit
            amountInput.focus();
        }
    });

    // Submit bet and refocus on Enter key in amount field
    amountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddBet(); // Add the bet
            // Refocus is handled within handleAddBet after successful submission
        }
    });

    // Listener for summary filter change
    summaryGameFilter.addEventListener('change', updateCustomerSummary);
    summaryCustomerFilter.addEventListener('change', updateCustomerSummary);
    summaryDateFilter.addEventListener('change', updateCustomerSummary);

    // Add listeners for game and customer selection changes
    selectGameDropdown.addEventListener('change', () => {
        // Only enable/disable delete button based on selection
        deleteGameBtn.disabled = !selectGameDropdown.value;
    });
    selectCustomerDropdown.addEventListener('change', () => {
        // Only enable/disable delete button based on selection
        deleteCustomerBtn.disabled = !selectCustomerDropdown.value;
    });

    // Listener for the new delete summary button
    deleteSummaryBtn.addEventListener('click', handleSummaryDelete);

    // Add listeners for grid filters
    gridDateFilter.addEventListener('change', updateBettingGrid);
    gridGameFilter.addEventListener('change', updateBettingGrid);
    gridCustomerFilter.addEventListener('change', updateBettingGrid);

    // Add listener for grid delete all button
    gridDeleteAllBtn.addEventListener('click', handleGridDeleteAll);

    // Listener to close modal if clicking outside the content
    window.addEventListener('click', (event) => {
        if (event.target == confirmationModal) {
            hideModal();
        }
    });

    // --- Initial Load ---
    async function initializeApp() {
        console.log('Initializing app...');
        populateBettingGrid(); // Create the grid structure (initially empty)
        await fetchGames();       // Fetch games for dropdowns
        await fetchCustomers();   // Fetch customers for dropdown
        await populateDropdowns(); // Populate all dropdowns including grid filters
        await updateCustomerSummary(); // Fetch initial summary (defaults to 'all' games)

        console.log('App initialized.');
    }

    initializeApp();
});
