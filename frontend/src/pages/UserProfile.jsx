/**
 * User Profile Page
 * Allows users to view and manage their account details.
 * Features include updating username, changing password with validation,
 * and uploading/removing a profile picture.
 * @module pages/UserProfile.jsx
 */

import React, { useState, useEffect, useRef } from "react";
import axios from "../config/axios";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Camera, CheckCircle, XCircle } from "lucide-react";

const UserProfile = ({ user, setUser }) => {
  const [profileData, setProfileData] = useState(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewPicture, setPreviewPicture] = useState(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [role, setRole] = useState(user.role || "public");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfileData(response.data);
      setNewUsername(response.data.username);
      setProfilePicture(response.data.profilePicture);
      setRole(response.data.role);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage({ type: "error", text: "Failed to load profile" });
      setIsLoading(false);
    }
  };

  const handleEditUsernameToggle = () => {
    if (isEditingUsername) {
      setNewUsername(profileData.username);
      setFieldErrors({});
    }
    setIsEditingUsername(!isEditingUsername);
    setMessage({ type: "", text: "" });
  };

  const handleEditRoleToggle = () => {
    if (isEditingRole) {
      setRole(profileData.role);
      setFieldErrors({});
    }
    setIsEditingRole(!isEditingRole);
    setMessage({ type: "", text: "" });
  };

  const handleEditPasswordToggle = () => {
    if (isEditingPassword) {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setFieldErrors({});
      setShowPasswords({ current: false, new: false, confirm: false });
    }
    setIsEditingPassword(!isEditingPassword);
    setMessage({ type: "", text: "" });
  };

  const validateUsername = (username) => {
    const errors = {};

    if (!username.trim()) {
      errors.username = "Username is required";
    } else if (username.trim().length < 3) {
      errors.username = "Username must be at least 3 characters long";
    } else if (username.trim().length > 20) {
      errors.username = "Username cannot exceed 20 characters";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      errors.username =
        "Username can only contain letters, numbers, underscores, and hyphens";
    }

    return errors;
  };

  // Password Validation
  const validateStrongPassword = (password) => {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[@$!%*?&]/.test(password),
    };
    return requirements;
  };

  const validatePassword = (data) => {
    const errors = {};

    if (!data.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!data.newPassword) {
      errors.newPassword = "New password is required";
    } else {
      const requirements = validateStrongPassword(data.newPassword);

      if (!requirements.minLength) {
        errors.newPassword = "Password must be at least 8 characters long";
      } else if (!requirements.hasUppercase) {
        errors.newPassword =
          "Password must contain at least one uppercase letter";
      } else if (!requirements.hasLowercase) {
        errors.newPassword =
          "Password must contain at least one lowercase letter";
      } else if (!requirements.hasNumber) {
        errors.newPassword = "Password must contain at least one number";
      } else if (!requirements.hasSpecial) {
        errors.newPassword =
          "Password must contain at least one special character (@$!%*?&)";
      } else if (data.newPassword === data.currentPassword) {
        errors.newPassword =
          "New password must be different from current password";
      }
    }

    if (!data.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (data.newPassword !== data.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    return errors;
  };

  const hasUsernameChanged = () => {
    return newUsername.trim() !== profileData.username;
  };

  const hasRoleChanged = () => {
    return role !== profileData.role;
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();

    setFieldErrors({});
    setMessage({ type: "", text: "" });

    if (!hasUsernameChanged()) {
      setMessage({ type: "info", text: "No changes made" });
      return;
    }

    const errors = validateUsername(newUsername);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        "/api/users/profile/username",
        { username: newUsername.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessage({ type: "success", text: "Username updated successfully!" });
      setProfileData({ ...profileData, username: response.data.username });
      setIsEditingUsername(false);
      setUser({ ...user, username: response.data.username });
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to update username";
      setFieldErrors({ username: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    setFieldErrors({});
    setMessage({ type: "", text: "" });

    const errors = validatePassword(passwordData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "/api/users/profile/password",
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessage({ type: "success", text: "Password updated successfully!" });
      setIsEditingPassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswords({ current: false, new: false, confirm: false });
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to update password";

      if (errorMsg.toLowerCase().includes("current")) {
        setFieldErrors({ currentPassword: errorMsg });
      } else {
        setFieldErrors({ newPassword: errorMsg });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();

    setFieldErrors({});
    setMessage({ type: "", text: "" });

    if (!hasRoleChanged()) {
      setMessage({ type: "info", text: "No changes made" });
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        "/api/users/profile/role",
        { role },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessage({ type: "success", text: "Role updated successfully!" });
      setProfileData({
        ...profileData,
        role: response.data.role,
      });
      setUser({ ...user, role: response.data.role });
      setIsEditingRole(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to update role";
      setFieldErrors({ role: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setMessage({
        type: "error",
        text: "Only JPG, JPEG, and PNG formats are allowed",
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage({
        type: "error",
        text: "Image size too large. Maximum size is 5MB",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewPicture(reader.result);
      setMessage({ type: "", text: "" });
    };
    reader.onerror = () => {
      setMessage({ type: "error", text: "Failed to read image file" });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPicture = async () => {
    if (!previewPicture) return;

    setIsUploadingPicture(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        "/api/users/profile/picture",
        { profilePicture: previewPicture },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setProfilePicture(response.data.profilePicture);
      setPreviewPicture(null);
      setMessage({
        type: "success",
        text: "Profile picture updated successfully!",
      });
      setUser({ ...user, profilePicture: response.data.profilePicture });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to upload picture",
      });
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleRemovePicture = async () => {
    if (!profilePicture) return;

    if (
      !window.confirm("Are you sure you want to remove your profile picture?")
    ) {
      return;
    }

    setIsUploadingPicture(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      await axios.delete("/api/users/profile/picture", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfilePicture(null);
      setPreviewPicture(null);
      setMessage({
        type: "success",
        text: "Profile picture removed successfully!",
      });
      setUser({ ...user, profilePicture: null });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to remove picture",
      });
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewPicture(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Password strength indicator component
  const PasswordStrengthIndicator = ({ password }) => {
    if (!password) return null;

    const requirements = validateStrongPassword(password);

    return (
      <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-xs font-semibold text-gray-400 mb-2">
          Password Requirements:
        </p>
        <div className="space-y-1">
          <RequirementItem
            met={requirements.minLength}
            text="At least 8 characters"
          />
          <RequirementItem
            met={requirements.hasUppercase}
            text="One uppercase letter"
          />
          <RequirementItem
            met={requirements.hasLowercase}
            text="One lowercase letter"
          />
          <RequirementItem met={requirements.hasNumber} text="One number" />
          <RequirementItem
            met={requirements.hasSpecial}
            text="One special character (@$!%*?&)"
          />
        </div>
      </div>
    );
  };

  const RequirementItem = ({ met, text }) => (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle size={14} className="text-green-400" />
      ) : (
        <XCircle size={14} className="text-gray-600" />
      )}
      <span className={`text-xs ${met ? "text-green-400" : "text-gray-500"}`}>
        {text}
      </span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 py-10 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-gray-800 p-6">
            <h1 className="text-2xl font-bold text-white">User Profile</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage your account information
            </p>
          </div>

          <div className="p-6">
            {message.text && (
              <div
                className={`mb-6 p-4 rounded-xl text-sm ${
                  message.type === "success"
                    ? "bg-green-500/10 text-green-400 border border-green-500/30"
                    : message.type === "error"
                      ? "bg-red-500/10 text-red-400 border border-red-500/30"
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-800">
              <div className="relative group">
                {previewPicture || profilePicture ? (
                  <img
                    src={previewPicture || profilePicture}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-500/50 shadow-lg shadow-blue-500/10"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-lg shadow-blue-500/20">
                    {profileData?.username?.charAt(0).toUpperCase()}
                  </div>
                )}

                {!previewPicture && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPicture}
                    className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full shadow-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    <Camera size={20} />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="mt-4 flex flex-col items-center gap-2">
                {previewPicture ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleUploadPicture}
                      disabled={isUploadingPicture}
                      className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isUploadingPicture ? "Uploading..." : "Save Picture"}
                    </button>
                    <button
                      onClick={handleCancelPreview}
                      disabled={isUploadingPicture}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-6 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 text-sm font-medium border border-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPicture}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 text-sm font-medium"
                    >
                      {profilePicture ? "Change Picture" : "Upload Picture"}
                    </button>
                    {profilePicture && (
                      <button
                        onClick={handleRemovePicture}
                        disabled={isUploadingPicture}
                        className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-6 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 text-center">
                  Max size: 5MB • Formats: JPG, PNG
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Username */}
              <div className="border-b border-gray-800 pb-6">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Username
                </label>
                {isEditingUsername ? (
                  <form onSubmit={handleUpdateUsername} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className={`w-full px-4 py-2.5 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                          fieldErrors.username
                            ? "border-red-500 focus:ring-red-500/40"
                            : "border-gray-700 focus:ring-blue-500/40 focus:border-blue-500"
                        }`}
                        placeholder="Enter new username"
                        disabled={isSaving}
                        maxLength={20}
                      />
                      <div className="flex justify-between items-start mt-1.5">
                        <div className="flex-1">
                          {fieldErrors.username && (
                            <p className="text-red-400 text-xs">
                              {fieldErrors.username}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 ml-2">
                          {newUsername.length}/20
                        </p>
                      </div>
                      {!hasUsernameChanged() && (
                        <p className="text-yellow-500/80 text-xs mt-1">
                          No changes made
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSaving || !hasUsernameChanged()}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={handleEditUsernameToggle}
                        disabled={isSaving}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium">
                      {profileData?.username}
                    </p>
                    <button
                      onClick={handleEditUsernameToggle}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Role */}
              <div className="border-b border-gray-800 pb-6">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Role
                </label>
                {isEditingRole ? (
                  <form onSubmit={handleUpdateRole} className="space-y-3">
                    <div>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                        disabled={isSaving}
                      >
                        <option value="public">Public</option>
                        <option value="lawyer">Lawyer</option>
                        <option value="academic">Academic</option>
                      </select>
                      {fieldErrors.role && (
                        <p className="text-red-400 text-xs mt-1">
                          {fieldErrors.role}
                        </p>
                      )}
                      {!hasRoleChanged() && (
                        <p className="text-yellow-500/80 text-xs mt-1">
                          No changes made
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSaving || !hasRoleChanged()}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={handleEditRoleToggle}
                        disabled={isSaving}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium capitalize">
                        {profileData?.role || "public"}
                      </p>
                      <button
                        onClick={handleEditRoleToggle}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1 rounded-full">
                        {profileData?.role === "lawyer"
                          ? "⚖️ Lawyer"
                          : profileData?.role === "academic"
                            ? "🎓 Academic"
                            : "👤 Public"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="border-b border-gray-800 pb-6">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Email Address
                </label>
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">{profileData?.email}</p>
                  <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full">
                    ✓ Verified
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>

              {/* Password */}
              <div className="border-b border-gray-800 pb-6">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Password
                </label>
                {isEditingPassword ? (
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">
                        Current Password{" "}
                        <span className="text-gray-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-2.5 pr-10 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.currentPassword
                              ? "border-red-500 focus:ring-red-500/40"
                              : "border-gray-700 focus:ring-blue-500/40 focus:border-blue-500"
                          }`}
                          placeholder="Enter current password"
                          disabled={isSaving}
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("current")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showPasswords.current ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                      {fieldErrors.currentPassword && (
                        <p className="text-red-400 text-xs mt-1">
                          {fieldErrors.currentPassword}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">
                        New Password <span className="text-gray-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-2.5 pr-10 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.newPassword
                              ? "border-red-500 focus:ring-red-500/40"
                              : "border-gray-700 focus:ring-blue-500/40 focus:border-blue-500"
                          }`}
                          placeholder="Enter new password"
                          disabled={isSaving}
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("new")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showPasswords.new ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                      {fieldErrors.newPassword && (
                        <p className="text-red-400 text-xs mt-1">
                          {fieldErrors.newPassword}
                        </p>
                      )}
                      <PasswordStrengthIndicator
                        password={passwordData.newPassword}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">
                        Confirm New Password{" "}
                        <span className="text-gray-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-2.5 pr-10 bg-gray-800 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.confirmPassword
                              ? "border-red-500 focus:ring-red-500/40"
                              : "border-gray-700 focus:ring-blue-500/40 focus:border-blue-500"
                          }`}
                          placeholder="Confirm new password"
                          disabled={isSaving}
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility("confirm")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="text-red-400 text-xs mt-1">
                          {fieldErrors.confirmPassword}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? "Updating…" : "Update Password"}
                      </button>
                      <button
                        type="button"
                        onClick={handleEditPasswordToggle}
                        disabled={isSaving}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium tracking-widest">
                      ••••••••
                    </p>
                    <button
                      onClick={handleEditPasswordToggle}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                )}
              </div>

              {/* Member Since */}
              <div className="pb-4">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Member Since
                </label>
                <p className="text-white font-medium">
                  {profileData?.createdAt && formatDate(profileData.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 py-2.5 rounded-xl transition-colors duration-200 font-medium text-sm"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
