import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FormulaSheet = () => {
  const { language } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const categories = [
    {
      name: t("Algebra", "Алгебра"),
      formulas: [
        { name: "Slope", formula: "m = (y₂ - y₁) / (x₂ - x₁)", note: "Rise over run" },
        { name: "Slope-Intercept", formula: "y = mx + b", note: "m = slope, b = y-intercept" },
        { name: "Point-Slope", formula: "y - y₁ = m(x - x₁)", note: "When you know a point and slope" },
        { name: "Quadratic Formula", formula: "x = (-b ± √(b²-4ac)) / 2a", note: "For ax² + bx + c = 0" },
        { name: "Difference of Squares", formula: "a² - b² = (a+b)(a-b)", note: "Common factoring pattern" },
        { name: "Perfect Square", formula: "(a+b)² = a² + 2ab + b²", note: "Expansion formula" },
        { name: "Discriminant", formula: "D = b² - 4ac", note: "D>0: 2 real roots, D=0: 1 root, D<0: no real roots" },
        { name: "Direct Variation", formula: "y = kx", note: "k is the constant of variation" },
        { name: "Inverse Variation", formula: "y = k/x", note: "As x increases, y decreases" },
      ],
    },
    {
      name: t("Geometry", "Геометрия"),
      formulas: [
        { name: "Area of Circle", formula: "A = πr²", note: "" },
        { name: "Circumference", formula: "C = 2πr = πd", note: "" },
        { name: "Area of Triangle", formula: "A = ½bh", note: "b = base, h = height" },
        { name: "Pythagorean Theorem", formula: "a² + b² = c²", note: "Right triangle only" },
        { name: "Special Right: 45-45-90", formula: "x : x : x√2", note: "Isosceles right triangle" },
        { name: "Special Right: 30-60-90", formula: "x : x√3 : 2x", note: "Half of equilateral triangle" },
        { name: "Area of Rectangle", formula: "A = lw", note: "" },
        { name: "Volume of Cylinder", formula: "V = πr²h", note: "" },
        { name: "Volume of Sphere", formula: "V = (4/3)πr³", note: "" },
        { name: "Surface Area of Sphere", formula: "SA = 4πr²", note: "" },
        { name: "Arc Length", formula: "s = (θ/360) × 2πr", note: "θ in degrees" },
        { name: "Sector Area", formula: "A = (θ/360) × πr²", note: "θ in degrees" },
        { name: "Distance Formula", formula: "d = √((x₂-x₁)² + (y₂-y₁)²)", note: "Between two points" },
        { name: "Midpoint", formula: "M = ((x₁+x₂)/2, (y₁+y₂)/2)", note: "" },
      ],
    },
    {
      name: t("Statistics", "Статистика"),
      formulas: [
        { name: "Mean", formula: "x̄ = Σx / n", note: "Sum of values ÷ count" },
        { name: "Probability", formula: "P(A) = favorable / total", note: "" },
        { name: "Percent Change", formula: "% = (new - old) / old × 100", note: "" },
        { name: "Standard Deviation", formula: "σ = √(Σ(x-x̄)² / n)", note: "Measures spread" },
        { name: "Combination", formula: "nCr = n! / (r!(n-r)!)", note: "Order doesn't matter" },
        { name: "Permutation", formula: "nPr = n! / (n-r)!", note: "Order matters" },
      ],
    },
    {
      name: t("Advanced", "Продвинутые"),
      formulas: [
        { name: "Exponential Growth", formula: "y = a(1+r)ᵗ", note: "a = initial, r = rate, t = time" },
        { name: "Exponential Decay", formula: "y = a(1-r)ᵗ", note: "Same but decreasing" },
        { name: "Compound Interest", formula: "A = P(1 + r/n)^(nt)", note: "P=principal, r=rate, n=compounds/yr" },
        { name: "Simple Interest", formula: "I = Prt", note: "P=principal, r=rate, t=time" },
        { name: "Vertex Form", formula: "y = a(x-h)² + k", note: "Vertex at (h, k)" },
        { name: "Circle Equation", formula: "(x-h)² + (y-k)² = r²", note: "Center (h,k), radius r" },
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-bold">{t("SAT Math Formula Sheet", "SAT Формулы")}</h2>
        <p className="text-muted-foreground">{t("Essential formulas you need to know for the SAT Math section", "Все формулы для раздела SAT Math")}</p>
      </div>

      <Tabs defaultValue="0">
        <TabsList className="grid grid-cols-4 w-full">
          {categories.map((cat, i) => (
            <TabsTrigger key={i} value={String(i)} className="text-xs">{cat.name}</TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat, i) => (
          <TabsContent key={i} value={String(i)} className="mt-4">
            <div className="grid gap-3">
              {cat.formulas.map((f, j) => (
                <Card key={j} className="hover:border-accent/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{f.name}</p>
                      {f.note && <p className="text-xs text-muted-foreground">{f.note}</p>}
                    </div>
                    <div className="bg-muted/50 px-4 py-2 rounded-lg shrink-0">
                      <code className="text-sm font-mono font-bold text-accent">{f.formula}</code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default FormulaSheet;
