"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export function PasswordInput({ className, ...props }) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup className={className}>
      <InputGroupInput
        type={show ? "text" : "password"}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((visible) => !visible)}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
