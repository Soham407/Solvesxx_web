"use client";

import { supabase } from "@/src/lib/supabaseClient";

/**
 * Generates a signed URL for a visitor photo.
 * This ensures photos are only accessible to authorized users and expire after a set time.
 * The visitor-photos bucket is PRIVATE -- signed URLs are the only way to access photos.
 * 
 * @param photoPath - The path to the photo in the visitor-photos bucket
 * @param expiresInSeconds - How long the URL is valid (default: 60 seconds)
 * @returns A signed URL string or null if the operation fails
 */
export async function getSignedVisitorPhotoUrl(
  photoPath: string | null | undefined,
  expiresInSeconds: number = 60
): Promise<string | null> {
  if (!photoPath) return null;

  try {
    const { data, error } = await supabase.storage
      .from("visitor-photos")
      .createSignedUrl(photoPath, expiresInSeconds);

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("Error creating signed URL:", err);
    return null;
  }
}

/**
 * Uploads a visitor photo to Supabase storage.
 * 
 * @param visitorId - The visitor's ID (used for file naming)
 * @param file - The photo file (Blob/File)
 * @returns Object with success status and the storage path
 */
export async function uploadVisitorPhoto(
  visitorId: string,
  file: Blob
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `visitors/${visitorId}/${timestamp}.webp`;

    const { error } = await supabase.storage
      .from("visitor-photos")
      .upload(path, file, {
        contentType: "image/webp",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return { success: true, path };
  } catch (err) {
    console.error("Error uploading visitor photo:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

/**
 * Deletes a visitor photo from Supabase storage.
 * 
 * @param photoPath - The path to the photo in the visitor-photos bucket
 * @returns Object with success status
 */
export async function deleteVisitorPhoto(
  photoPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from("visitor-photos")
      .remove([photoPath]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (err) {
    console.error("Error deleting visitor photo:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Delete failed",
    };
  }
}
