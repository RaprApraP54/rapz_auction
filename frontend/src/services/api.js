const API_BASE_URL = 'http://localhost:5000/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Terjadi kesalahan');
    }
    return data;
};

export const authAPI = {
    register: async (username, email, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        return handleResponse(response);
    },

    login: async (email, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return handleResponse(response);
    },

    linkWallet: async (walletAddress) => {
        const response = await fetch(`${API_BASE_URL}/auth/wallet`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ wallet_address: walletAddress })
        });
        return handleResponse(response);
    },

    getCurrentUser: async () => {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: getAuthHeader()
        });
        return handleResponse(response);
    }
};

export const auctionAPI = {
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/auctions`);
        return handleResponse(response);
    },

    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/auctions/${id}`);
        return handleResponse(response);
    },

    create: async (auctionData) => {
        const response = await fetch(`${API_BASE_URL}/auctions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(auctionData)
        });
        return handleResponse(response);
    },

    updateContractId: async (id, contractAuctionId) => {
        const response = await fetch(`${API_BASE_URL}/auctions/${id}/contract`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ contract_auction_id: contractAuctionId })
        });
        return handleResponse(response);
    },

    join: async (id) => {
        const response = await fetch(`${API_BASE_URL}/auctions/${id}/join`, {
            method: 'POST',
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    getLeaderboard: async (id) => {
        const response = await fetch(`${API_BASE_URL}/auctions/${id}/leaderboard`);
        return handleResponse(response);
    },

    // Finalize auction - update database status to ended
    finalize: async (id) => {
        const response = await fetch(`${API_BASE_URL}/auctions/${id}/finalize`, {
            method: 'POST',
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    // Log bid to database
    logBid: async (id, amount, txHash) => {
        const response = await fetch(`${API_BASE_URL}/auctions/${id}/bid-log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ amount, tx_hash: txHash })
        });
        return handleResponse(response);
    }
};

export const adminAPI = {
    getAllAuctions: async () => {
        const response = await fetch(`${API_BASE_URL}/admin/auctions`, {
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    updateAuction: async (id, data) => {
        const response = await fetch(`${API_BASE_URL}/admin/auctions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    deleteAuction: async (id) => {
        const response = await fetch(`${API_BASE_URL}/admin/auctions/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    stopAuction: async (id) => {
        const response = await fetch(`${API_BASE_URL}/admin/auctions/${id}/stop`, {
            method: 'POST',
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    confirmStop: async (id, txHash, winnerData = {}) => {
        const response = await fetch(`${API_BASE_URL}/admin/auctions/${id}/confirm-stop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({
                tx_hash: txHash,
                winner_wallet: winnerData.winnerWallet || null,
                highest_bid: winnerData.highestBid || null,
                total_participants: winnerData.totalParticipants || 0
            })
        });
        return handleResponse(response);
    },

    getDeliveries: async () => {
        const response = await fetch(`${API_BASE_URL}/admin/deliveries`, {
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    updateDelivery: async (id, data) => {
        const response = await fetch(`${API_BASE_URL}/admin/deliveries/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    }
};

// Delivery API
export const deliveryAPI = {
    getMyWins: async () => {
        const response = await fetch(`${API_BASE_URL}/delivery/my-wins`, {
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    getByAuction: async (auctionId) => {
        const response = await fetch(`${API_BASE_URL}/delivery/auction/${auctionId}`, {
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    submitAddress: async (auctionId, data) => {
        const response = await fetch(`${API_BASE_URL}/delivery/auction/${auctionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    }
};

export const reportAPI = {
    // Admin reports
    getAdminMonthly: async (month) => {
        const response = await fetch(`${API_BASE_URL}/reports/admin/monthly?month=${month}`, {
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    downloadAdminPDF: (month) => {
        const token = localStorage.getItem('token');
        window.open(`${API_BASE_URL}/reports/admin/monthly/pdf?month=${month}&token=${token}`, '_blank');
    },

    // User reports
    getUserActivity: async (month = '') => {
        const url = month
            ? `${API_BASE_URL}/reports/user/activity?month=${month}`
            : `${API_BASE_URL}/reports/user/activity`;
        const response = await fetch(url, {
            headers: getAuthHeader()
        });
        return handleResponse(response);
    },

    downloadUserPDF: (month = '') => {
        const token = localStorage.getItem('token');
        const monthParam = month ? `&month=${month}` : '';
        window.open(`${API_BASE_URL}/reports/user/activity/pdf?token=${token}${monthParam}`, '_blank');
    }
};
