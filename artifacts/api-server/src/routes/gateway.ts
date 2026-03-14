import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

// [3.5] Dynamic API Gateway — fetch external data, flatten JSON, inject X-Powered-By header
router.get("/gateway/users", async (_req: Request, res: Response) => {
  try {
    const response = await axios.get("https://jsonplaceholder.typicode.com/users");
    const rawUsers = response.data;

    // [3.5] Flatten nested JSON — address and company objects are flattened to top level
    const flattened = rawUsers.map((user: any) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      website: user.website,
      // Flatten address
      street: user.address?.street,
      suite: user.address?.suite,
      city: user.address?.city,
      zipcode: user.address?.zipcode,
      lat: user.address?.geo?.lat,
      lng: user.address?.geo?.lng,
      // Flatten company
      company: user.company?.name,
      companyCatchPhrase: user.company?.catchPhrase,
      companyBs: user.company?.bs,
    }));

    // [3.5] Inject custom X-Powered-By header
    res.setHeader("X-Powered-By", "LMS-API-Gateway/1.0");
    res.json({ status: "success", count: flattened.length, data: flattened });
  } catch (err: any) {
    res.status(502).json({ status: "error", message: "Gateway error: " + err.message });
  }
});

export default router;
