import type { FaqItem } from "./types";

export const faq: FaqItem[] = [
  {
    question: "Does it cost anything to work with you?",
    answer: (
      <p>
        No. We are paid by the insurance carrier when you enroll, and the plan
        premium is the same whether you use an agent or not.
      </p>
    ),
  },
  {
    question: "Do you sell every plan available in my area?",
    answer: (
      <p>
        No, and no agent does. You can always compare every option at
        Medicare.gov or by calling 1-800-MEDICARE.
      </p>
    ),
  },
  {
    question: "What should I bring to a review?",
    answer: (
      <p>
        Your Medicare card, a list of your prescriptions with dosages, and the
        names of any doctors you want to keep. That is enough to run a real
        comparison.
      </p>
    ),
  },
  {
    question: "Will you keep helping me after I enroll?",
    answer: (
      <p>
        Yes. Claims questions, ID card problems, and the annual check are the
        part people actually need most, and they are included.
      </p>
    ),
  },
];
