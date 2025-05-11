import { Nation } from "@prisma/client";

export const handleSubmit = async (action: "POST" | "PUT", id: string | undefined, data: Omit<Nation, "id" | "createdAt" | "updatedAt">) => {
    console.log("STARTING SUBMIT")
    try {
      const response = await fetch(`/api/nations${action === "PUT" ? ("/"+id) : ""}`, {
        method: action,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update nation');
      }

    } catch (error) {
      console.error('Error updating nation:', error);
      // TODO: Show error message to user
    }
};
