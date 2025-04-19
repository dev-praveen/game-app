document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selections ---
    // Game Management
    const gameNameInput = document.getElementById('game-name');
    const addGameBtn = document.getElementById('add-game-btn');
    const selectGameDropdown = document.getElementById('select-game');
    // const deleteGameBtn = selectGameDropdown.nextElementSibling; // Assuming delete btn is next sibling

    // Customer Management
    const customerNameInput = document.getElementById('customer-name');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const selectCustomerDropdown = document.getElementById('select-customer');
    // const deleteCustomerBtn = selectCustomerDropdown.nextElementSibling; // Assuming delete btn is next sibling

    // Number Entry
    const numberInput = document.getElementById('number-input');
    const singleDigitInput = document.getElementById('single-digit-input');
    const amountInput = document.getElementById('amount-input');
    const addBetBtn = document.getElementById('add-bet-btn');
    const deleteAllBtn = document.getElementById('delete-all-btn');

    // Betting Grid
    const bettingGridBody = document.getElementById('betting-grid').querySelector('tbody');

    // Customer Summary
    const summaryGameFilter = document.getElementById('summary-game-filter');
    const summaryCustomerFilter = document.getElementById('summary-customer-filter'); // New filter
    const deleteSummaryBtn = document.getElementById('delete-summary-btn'); // New delete button
    const customerSummaryBody = document.getElementById('customer-summary').querySelector('tbody');
    const summaryTotalCell = document.getElementById('summary-total');
    const summaryDateFilter = document.getElementById('summary-date-filter'); // Date picker

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
    }

    // Function to populate customer dropdown
    function populateCustomerDropdown() {
        // Clear existing options (except the default)
        selectCustomerDropdown.innerHTML = '<option value="">Select a customer</option>';
        summaryCustomerFilter.innerHTML = '<option value="all">All Customers</option>';

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
    }

    // Function to generate the betting grid structure AND populate it
    function populateBettingGrid() {
        bettingGridBody.innerHTML = ''; // Clear existing grid rows

        // --- Create Grid Structure ---
        // SD Row (Single Digit)
        const sdRow = bettingGridBody.insertRow();
        const sdHeaderCell = sdRow.insertCell();
        sdHeaderCell.outerHTML = '<th>SD</th>'; // Use th for header cell
        for (let i = 0; i < 10; i++) {
            const cell = sdRow.insertCell();
            cell.id = `grid-sd-${i}`; // ID for single digit bets
            cell.textContent = ''; // Initially empty
        }

        // DD Rows (Double Digit 00-99)
        for (let i = 0; i < 10; i++) { // Tens digit (0-9)
            const row = bettingGridBody.insertRow();
            const headerCell = row.insertCell();
            headerCell.outerHTML = `<th>${i}</th>`; // Row header (tens digit)
            for (let j = 0; j < 10; j++) { // Units digit (0-9)
                const cell = row.insertCell();
                const number = `${i}${j}`;
                cell.id = `grid-dd-${number}`; // ID for double digit bets
                cell.textContent = ''; // Initially empty
            }
        }

        // --- Populate Grid with Bet Data ---
        console.log("Populating grid with bets:", bets);
        bets.forEach(bet => {
            const cellId = bet.bet_type === 'SD'
                ? `grid-sd-${bet.number}`
                : `grid-dd-${bet.number.padStart(2, '0')}`; // Ensure DD number is 2 digits for ID
            const cell = document.getElementById(cellId);
            if (cell) {
                const currentAmount = parseFloat(cell.textContent) || 0;
                // Display sum, maybe format later if needed
                cell.textContent = currentAmount + bet.amount;
            } else {
                console.warn(`Cell with ID ${cellId} not found for bet:`, bet);
            }
        });
        console.log("Betting grid populated.");
    }

    // Function to update the delete button state
    function updateDeleteButtonState(hasData) {
        const deleteBtn = document.getElementById('delete-summary-btn');
        if (!hasData) {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.5';
            deleteBtn.style.cursor = 'not-allowed';
        } else {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
            deleteBtn.style.cursor = 'pointer';
        }
    }

    // Function to fetch and update the customer summary table
    async function updateCustomerSummary() {
        const selectedGameId = summaryGameFilter.value; // 'all' or a game ID
        const selectedCustomerId = summaryCustomerFilter.value; // 'all' or a customer ID
        const date = summaryDateFilter.value || today;
        console.log(`Fetching summary for gameId: ${selectedGameId}, customerId: ${selectedCustomerId}, date: ${date}`);

        // Construct query params, only include if not 'all'
        const queryParams = new URLSearchParams();
        if (selectedGameId !== 'all') queryParams.append('gameId', selectedGameId);
        if (selectedCustomerId !== 'all') queryParams.append('customerId', selectedCustomerId);
        queryParams.append('date', date);

        try {
            const response = await fetch(`/api/summary?${queryParams.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch summary');
            const summaryData = await response.json();
            console.log("Fetched summary data:", summaryData);

            // Update delete button state based on whether there's data
            updateDeleteButtonState(summaryData.length > 0);

            // Clear existing summary rows (keep the header)
            // Find the total row if it exists, otherwise null
            let totalRow = customerSummaryBody.querySelector('tr:last-child');
            if (totalRow && totalRow.cells[0].textContent !== 'Total') {
                totalRow = null; // It wasn't the total row
            }
            // Clear all rows except the potential total row
            while (customerSummaryBody.firstChild && customerSummaryBody.firstChild !== totalRow) {
                customerSummaryBody.removeChild(customerSummaryBody.firstChild);
            }
            // If total row exists, clear its amount cell
            if (totalRow) {
                totalRow.cells[1].textContent = '₹ 0';
            }

            let grandTotal = 0;
            summaryData.forEach(item => {
                // Insert new rows *before* the total row if it exists
                const row = customerSummaryBody.insertBefore(document.createElement('tr'), totalRow);
                row.insertCell().textContent = item.customer_name;
                const amountCell = row.insertCell();
                amountCell.textContent = `₹ ${item.total_amount.toFixed(2)}`; // Format amount
                amountCell.style.textAlign = 'right'; // Align amount right
                grandTotal += item.total_amount;
            });

            // Ensure the Total row exists and update it
            if (!totalRow) {
                totalRow = customerSummaryBody.insertRow(); // Add total row if it wasn't there
                totalRow.insertCell().textContent = 'Total';
                const totalAmountCell = totalRow.insertCell();
                totalAmountCell.id = 'summary-total'; // Ensure ID is set
                totalAmountCell.style.fontWeight = 'bold';
                totalAmountCell.style.borderTop = '2px solid #343a40';
                totalRow.cells[0].style.borderTop = '2px solid #343a40';
            }
            const finalTotalCell = document.getElementById('summary-total'); // Get it by ID to be sure
            finalTotalCell.textContent = `₹ ${grandTotal.toFixed(2)}`;
            finalTotalCell.style.textAlign = 'right'; // Align amount right

        } catch (error) {
            console.error('Error updating customer summary:', error);
            alert('Could not update customer summary.');
            // Clear summary on error
            customerSummaryBody.innerHTML = ''; // Clear all rows
            const totalRow = customerSummaryBody.insertRow(); // Add back total row structure
            totalRow.insertCell().textContent = 'Total';
            const totalAmountCell = totalRow.insertCell();
            totalAmountCell.id = 'summary-total';
            totalAmountCell.textContent = '₹ 0';
        }
    }

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

        // --- Simplified Modal Listener Logic ---
        // Define the action to take on confirmation *before* showing the modal
        const confirmAction = async () => {
            // Remove listeners immediately to prevent multiple clicks
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

                // Refresh all data after successful deletion
                await Promise.all([
                    fetchGames(),       // Refresh games dropdown
                    fetchCustomers(),   // Refresh customers dropdown
                    fetchBetsForCurrentSelection(), // Refresh grid based on main selection
                    updateCustomerSummary() // Refresh summary based on summary filters
                ]);

                // Clear selections
                selectGameDropdown.value = '';
                selectCustomerDropdown.value = '';

                // Clear betting inputs
                numberInput.value = '';
                singleDigitInput.value = '';
                amountInput.value = '';

            } catch (error) {
                console.error("Error deleting bets:", error);
                alert(`Could not delete bets: ${error.message}`);
            }
        };

        const cancelAction = () => {
            // Remove listeners immediately
            modalConfirmBtn.removeEventListener('click', confirmAction);
            modalCancelBtn.removeEventListener('click', cancelAction);
            hideModal();
            console.log("Delete cancelled.");
        };

        // Add the listeners
        modalConfirmBtn.addEventListener('click', confirmAction);
        modalCancelBtn.addEventListener('click', cancelAction);

        // Now show the modal
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
            betType, // 'SD' or 'DD'
            number: numberValue,
            amount,
            betDate: summaryDateFilter.value // Include the selected date
        };

        console.log('Adding bet:', betData);

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

            // --- Refresh data after successful bet ---
            // Fetch bets for the *current* selection to update the grid
            await fetchBetsForCurrentSelection();
            // Fetch the summary again to update totals
            await updateCustomerSummary();

            // Clear inputs and refocus
            numberInput.value = '';
            singleDigitInput.value = '';
            amountInput.value = '';
            lastFocusedNumberInput.focus(); // Focus back on the last used number input

        } catch (error) {
            console.error('Error adding bet:', error);
            alert(`Could not add bet: ${error.message}`);
        }
    }

    // --- Event Listeners ---
    addGameBtn.addEventListener('click', handleAddGame);
    addCustomerBtn.addEventListener('click', handleAddCustomer);
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

    // Add listeners for game and customer selection changes (for the main betting grid)
    selectGameDropdown.addEventListener('change', fetchBetsForCurrentSelection);
    selectCustomerDropdown.addEventListener('change', fetchBetsForCurrentSelection);

    // Listener for the new delete summary button
    deleteSummaryBtn.addEventListener('click', handleSummaryDelete);

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
        // Don't fetch all bets initially, wait for selection
        // await fetchBets(); // Remove initial fetch of all bets
        await updateCustomerSummary(); // Fetch initial summary (defaults to 'all' games)
        console.log('App initialized.');
    }

    initializeApp();
});
