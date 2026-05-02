/**
 * Frontend Page: src/pages/admin/UserList.jsx
 */
import React, { useEffect, useState } from "react";
import axios from "../../config/axios";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckCircle,
  XCircle,
  Edit2,
  Ban,
  Unlock,
  Save,
  X,
} from "lucide-react";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination & Search State
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    username: "",
    role: "public",
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `/api/admin/users?page=${page}&limit=10&search=${search}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalUsers(res.data.totalUsers || 0);
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleDeleteUser = async (userId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this user? This cannot be undone.",
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`/api/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchUsers();
      } catch (error) {
        alert(error.response?.data?.message || "Failed to delete user");
      }
    }
  };

  const handleToggleVerify = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/admin/users/${userId}/verify`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchUsers();
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const handleToggleSuspend = async (userId, currentStatus) => {
    const action = currentStatus ? "activate" : "suspend";
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      try {
        const token = localStorage.getItem("token");
        await axios.patch(
          `/api/admin/users/${userId}/suspend`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        fetchUsers();
      } catch (error) {
        alert(
          error.response?.data?.message || "Failed to update suspension status",
        );
      }
    }
  };

  // --- EDIT MODAL HANDLERS ---

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditFormData({ username: user.username, role: user.role });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditFormData({ username: "", role: "public" });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/admin/users/${editingUser._id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      closeEditModal();
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update user");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 relative">
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
          Total: {totalUsers}
        </span>
      </div>

      {/* --- SEARCH --- */}
      <div className="mb-6 relative">
        <input
          type="text"
          placeholder="Search by email or username..."
          className="w-full p-3 pl-10 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Search className="absolute left-3 top-3.5 text-gray-500" size={20} />
      </div>

      {/* --- TABLE --- */}
      <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-750 text-gray-300 border-b border-gray-700">
              <tr>
                <th className="p-4">Username</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className={`hover:bg-gray-700/50 ${
                      user.isSuspended ? "bg-red-900/10" : ""
                    }`}
                  >
                    <td className="p-4 font-medium">
                      {user.username}
                      {user.isSuspended && (
                        <span className="ml-2 text-xs text-red-500 font-bold">
                          (SUSPENDED)
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-400">{user.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs uppercase font-bold ${
                          user.role === "admin"
                            ? "bg-red-900 text-red-200"
                            : user.role === "lawyer"
                              ? "bg-purple-900 text-purple-200"
                              : "bg-blue-900 text-blue-200"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.isSuspended ? (
                        <span className="text-red-500 text-sm flex items-center gap-1">
                          <Ban size={14} /> Banned
                        </span>
                      ) : user.isVerified ? (
                        <span className="text-green-400 text-sm flex items-center gap-1">
                          <CheckCircle size={14} /> Verified
                        </span>
                      ) : (
                        <span className="text-yellow-500 text-sm flex items-center gap-1">
                          <XCircle size={14} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-colors"
                          title="Edit User Details"
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Verify Toggle */}
                        <button
                          onClick={() => handleToggleVerify(user._id)}
                          className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                          title={
                            user.isVerified
                              ? "Revoke Verification"
                              : "Verify User"
                          }
                        >
                          {user.isVerified ? (
                            <XCircle size={16} />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                        </button>

                        {/* Suspend Toggle */}
                        <button
                          onClick={() =>
                            handleToggleSuspend(user._id, user.isSuspended)
                          }
                          className={`p-2 rounded transition-colors ${
                            user.isSuspended
                              ? "bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white"
                              : "bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white"
                          }`}
                          title={
                            user.isSuspended ? "Unsuspend User" : "Suspend User"
                          }
                        >
                          {user.isSuspended ? (
                            <Unlock size={16} />
                          ) : (
                            <Ban size={16} />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="p-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PAGINATION --- */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <span className="text-gray-400">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* --- EDIT MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Edit User</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      username: e.target.value,
                    })
                  }
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Role
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value })
                  }
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="public">Public</option>
                  <option value="lawyer">Lawyer</option>
                  <option value="academic">Academic</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium flex justify-center items-center gap-2 transition-colors"
                >
                  <Save size={18} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
