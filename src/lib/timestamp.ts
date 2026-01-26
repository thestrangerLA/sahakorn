
import { Timestamp } from "firebase/firestore";

export function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  // Handle cases where the data might be serialized from the server
  if (value.seconds && typeof value.seconds === 'number') {
    return new Timestamp(value.seconds, value.nanoseconds).toDate();
  }
  // Handle ISO strings
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }
  return null;
}
