# CV Builder with Real-Time AI Optimization - Complete Implementation Prompt

## Project Overview
Build a Lebenslauf (CV) creator for JobAssist that integrates Reactive Resume templates with real-time AI optimization via Groq. Users fill a form, get AI-enhanced content as they type, select a template, and export to PDF/DOCX.

---

## Architecture

```
Frontend (React)
├── Form Component (collects CV data)
├── Template Preview (live rendering)
├── Export Handler (PDF/DOCX)
└── AI Optimization Layer (Groq integration)

Backend (Node.js)
├── /api/optimize - Groq text enhancement endpoint
├── /api/export/pdf - PDF generation
└── /api/export/docx - DOCX generation

Data Layer
└── Reactive Resume JSON Schema (unified CV format)
```

---

## Data Schema (Reactive Resume Format)

Use this as your CV data structure - it's compatible with Reactive Resume themes and export tools:

```javascript
const cvSchema = {
  basics: {
    name: "",
    label: "",
    image: "",
    email: "",
    phone: "",
    url: "",
    summary: "",
    location: {
      address: "",
      postalCode: "",
      city: "",
      countryCode: "",
      region: ""
    },
    profiles: [
      { network: "", username: "", url: "" }
    ]
  },
  work: [
    {
      name: "",         // Company name
      position: "",     // Job title
      startDate: "",
      endDate: "",
      summary: "",      // Job description
      highlights: [],   // Key achievements
      url: "",
      location: ""
    }
  ],
  volunteer: [
    {
      organization: "",
      position: "",
      startDate: "",
      endDate: "",
      summary: "",
      highlights: [],
      url: ""
    }
  ],
  education: [
    {
      institution: "",
      url: "",
      area: "",        // Field of study
      studyType: "",   // Degree
      startDate: "",
      endDate: "",
      score: "",
      courses: []
    }
  ],
  skills: [
    {
      name: "",        // Skill category
      level: "",       // Beginner/Intermediate/Advanced
      keywords: []     // Individual skills
    }
  ],
  languages: [
    {
      language: "",
      fluency: ""      // Native/Fluent/Intermediate/Basic
    }
  ],
  interests: [
    {
      name: "",
      keywords: []
    }
  ],
  references: [
    {
      name: "",
      reference: ""
    }
  ],
  projects: [
    {
      name: "",
      description: "",
      highlights: [],
      keywords: [],
      startDate: "",
      endDate: "",
      url: "",
      roles: [],
      entity: ""
    }
  ]
};
```

---

## Frontend Implementation

### 1. Form Component
- **Purpose**: Collect user data in structured way
- **Key sections**: Basics, Work, Education, Skills, Languages
- **For each section**: Provide "Add" button to add multiple entries
- **Real-time optimization trigger**: After user finishes typing in a field (on blur), call Groq

```javascript
// Pseudocode for form with optimization
const CVForm = () => {
  const [cv, setCv] = useState(cvSchema);
  const [loading, setLoading] = useState({});

  const handleFieldChange = (path, value) => {
    // Update field in state
    setCv(prevCv => setNestedValue(prevCv, path, value));
  };

  const handleFieldBlur = async (path, value, type) => {
    // Type: 'job', 'summary', 'description', etc.
    if (!value || value.length < 10) return; // Don't optimize short text

    setLoading(prev => ({ ...prev, [path]: true }));

    try {
      const optimized = await optimizeText(value, type);
      setCv(prevCv => setNestedValue(prevCv, path, optimized));
    } catch (error) {
      console.error('Optimization failed:', error);
      // Keep original text if optimization fails
    } finally {
      setLoading(prev => ({ ...prev, [path]: false }));
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      {/* Basics Section */}
      <input
        value={cv.basics.name}
        onChange={(e) => handleFieldChange('basics.name', e.target.value)}
        placeholder="Full Name"
      />

      {/* Work Experience Section */}
      {cv.work.map((job, idx) => (
        <div key={idx} className="border p-4 my-4 rounded">
          <input
            value={job.position}
            onChange={(e) => handleFieldChange(`work.${idx}.position`, e.target.value)}
            placeholder="Job Title"
          />
          <input
            value={job.name}
            onChange={(e) => handleFieldChange(`work.${idx}.name`, e.target.value)}
            placeholder="Company"
          />
          <textarea
            value={job.summary}
            onChange={(e) => handleFieldChange(`work.${idx}.summary`, e.target.value)}
            onBlur={() => handleFieldBlur(`work.${idx}.summary`, job.summary, 'job_description')}
            placeholder="Job Description"
            className={loading[`work.${idx}.summary`] ? 'opacity-50' : ''}
          />
          {loading[`work.${idx}.summary`] && <span className="text-sm text-gray-500">Optimizing...</span>}
        </div>
      ))}

      {/* Similar structure for education, skills, etc. */}
    </div>
  );
};
```

### 2. Template Selector
- **Purpose**: Let user choose CV layout from Reactive Resume themes
- **Options**: Provide 2-3 clean templates initially (can expand)
- **Display**: Grid of template previews or dropdown

```javascript
const TemplateSelector = ({ selectedTemplate, onSelect }) => {
  const templates = [
    { id: 'minimal', name: 'Minimal', preview: '...' },
    { id: 'professional', name: 'Professional', preview: '...' },
    { id: 'modern', name: 'Modern', preview: '...' }
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {templates.map(template => (
        <button
          key={template.id}
          onClick={() => onSelect(template.id)}
          className={`p-4 border rounded ${selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : ''}`}
        >
          {template.name}
        </button>
      ))}
    </div>
  );
};
```

### 3. Live Preview Component
- **Purpose**: Show real-time rendering of CV with selected template
- **Updates**: Whenever user changes data or selects template
- **Rendering**: Use HTML template with TailwindCSS

```javascript
const CVPreview = ({ cv, template }) => {
  return (
    <div className="border p-8 bg-white rounded shadow">
      {template === 'minimal' && <MinimalTemplate cv={cv} />}
      {template === 'professional' && <ProfessionalTemplate cv={cv} />}
      {template === 'modern' && <ModernTemplate cv={cv} />}
    </div>
  );
};

// Template example
const MinimalTemplate = ({ cv }) => (
  <div className="max-w-2xl mx-auto font-sans">
    <h1 className="text-4xl font-bold">{cv.basics.name}</h1>
    <p className="text-gray-600">{cv.basics.label}</p>
    <p className="text-sm">{cv.basics.email} | {cv.basics.phone}</p>

    {cv.basics.summary && (
      <div className="mt-6">
        <h2 className="text-xl font-bold border-b pb-2">Summary</h2>
        <p className="mt-2 text-sm">{cv.basics.summary}</p>
      </div>
    )}

    {cv.work.length > 0 && (
      <div className="mt-6">
        <h2 className="text-xl font-bold border-b pb-2">Experience</h2>
        {cv.work.map((job, idx) => (
          <div key={idx} className="mt-4">
            <div className="flex justify-between">
              <h3 className="font-bold">{job.position}</h3>
              <span className="text-sm text-gray-600">{job.startDate} - {job.endDate}</span>
            </div>
            <p className="text-sm text-gray-600">{job.name}</p>
            <p className="mt-2 text-sm">{job.summary}</p>
          </div>
        ))}
      </div>
    )}

    {/* Similar blocks for education, skills, etc. */}
  </div>
);
```

### 4. Export Component
```javascript
const ExportButtons = ({ cv, template }) => {
  const handlePDFExport = async () => {
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, template })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cv.basics.name.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  };

  const handleDOCXExport = async () => {
    try {
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, template })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cv.basics.name.replace(/\s+/g, '-')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('DOCX export failed:', error);
    }
  };

  return (
    <div className="flex gap-4">
      <button onClick={handlePDFExport} className="px-4 py-2 bg-blue-500 text-white rounded">
        Export PDF
      </button>
      <button onClick={handleDOCXExport} className="px-4 py-2 bg-green-500 text-white rounded">
        Export DOCX
      </button>
    </div>
  );
};
```

---

## Backend Implementation

### 1. Groq Optimization Endpoint

```javascript
// routes/api/optimize.js
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const OPTIMIZATION_PROMPTS = {
  job_description: `Optimize this job description for a CV. Make it concise, professional, and impactful. Use action verbs. Keep it 2-3 sentences. Return ONLY the optimized text, no quotes or explanations.`,

  summary: `Write a professional professional summary for a CV based on this input. Make it compelling, concise (3-4 sentences), and focused on value. Return ONLY the summary text.`,

  education: `Optimize this education entry for a CV. Keep it concise and professional. Return ONLY the optimized text.`,

  skill: `Suggest improvements to this skill or list of skills for a CV. Format as comma-separated skills. Return ONLY the skill list.`,

  achievement: `Optimize this achievement/highlight for a CV. Use active voice and quantify when possible. Return ONLY the optimized text.`
};

export default async (req, res) => {
  const { content, type } = req.body;

  if (!content || !type || !OPTIMIZATION_PROMPTS[type]) {
    return res.status(400).json({ error: 'Missing or invalid content/type' });
  }

  try {
    const message = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `${OPTIMIZATION_PROMPTS[type]}\n\nText to optimize: "${content}"`
        }
      ],
      model: 'mixtral-8x7b-32768', // Fast, good quality
      temperature: 0.7,
      max_tokens: 300
    });

    const optimized = message.choices[0].message.content.trim();

    res.json({ optimized });
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: 'Optimization failed', details: error.message });
  }
};
```

### 2. PDF Export Endpoint

```javascript
// routes/api/export/pdf.js
import html2pdf from 'html2pdf.js';

export default async (req, res) => {
  const { cv, template } = req.body;

  try {
    // Generate HTML from template (matching your CVPreview component)
    const html = generateHTML(cv, template);

    // Convert to PDF using html2pdf
    const opt = {
      margin: 10,
      filename: `${cv.basics.name}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    const pdf = html2pdf().set(opt).from(html).save();

    res.status(200).json({ success: true, message: 'PDF generated' });
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
};
```

### 3. DOCX Export Endpoint

```javascript
// routes/api/export/docx.js
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import fs from 'fs';

export default async (req, res) => {
  const { cv } = req.body;

  try {
    const doc = new Document({
      sections: [
        {
          children: [
            // Name & Contact
            new Paragraph({
              text: cv.basics.name,
              heading: HeadingLevel.HEADING_1,
              bold: true,
              size: 32
            }),
            new Paragraph({
              text: cv.basics.label || '',
              italics: true,
              size: 20
            }),
            new Paragraph({
              text: `${cv.basics.email} | ${cv.basics.phone} | ${cv.basics.location?.city || ''}`
            }),

            // Summary
            ...(cv.basics.summary ? [
              new Paragraph({ text: '', spacing: { before: 200 } }),
              new Paragraph({
                text: 'PROFESSIONAL SUMMARY',
                heading: HeadingLevel.HEADING_2,
                bold: true
              }),
              new Paragraph(cv.basics.summary)
            ] : []),

            // Experience
            ...(cv.work.length > 0 ? [
              new Paragraph({ text: '', spacing: { before: 200 } }),
              new Paragraph({
                text: 'EXPERIENCE',
                heading: HeadingLevel.HEADING_2,
                bold: true
              }),
              ...cv.work.flatMap(job => [
                new Paragraph({
                  text: `${job.position}`,
                  bold: true
                }),
                new Paragraph({
                  text: `${job.name} | ${job.startDate} - ${job.endDate}`,
                  italics: true
                }),
                new Paragraph(job.summary || ''),
                new Paragraph({ text: '' })
              ])
            ] : []),

            // Education
            ...(cv.education.length > 0 ? [
              new Paragraph({ text: '', spacing: { before: 200 } }),
              new Paragraph({
                text: 'EDUCATION',
                heading: HeadingLevel.HEADING_2,
                bold: true
              }),
              ...cv.education.flatMap(edu => [
                new Paragraph({
                  text: `${edu.studyType} in ${edu.area}`,
                  bold: true
                }),
                new Paragraph({
                  text: `${edu.institution} | ${edu.startDate} - ${edu.endDate}`,
                  italics: true
                }),
                new Paragraph({ text: '' })
              ])
            ] : []),

            // Skills
            ...(cv.skills.length > 0 ? [
              new Paragraph({ text: '', spacing: { before: 200 } }),
              new Paragraph({
                text: 'SKILLS',
                heading: HeadingLevel.HEADING_2,
                bold: true
              }),
              ...cv.skills.map(skill =>
                new Paragraph(`${skill.name}: ${skill.keywords.join(', ')}`)
              )
            ] : [])
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${cv.basics.name}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error('DOCX generation error:', error);
    res.status(500).json({ error: 'DOCX generation failed' });
  }
};
```

---

## Frontend Hook to Groq

```javascript
// hooks/useOptimizeText.js
const useOptimizeText = () => {
  const optimizeText = async (content, type) => {
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type })
      });

      if (!response.ok) throw new Error('Optimization failed');

      const { optimized } = await response.json();
      return optimized;
    } catch (error) {
      console.error('Error:', error);
      return content; // Return original if optimization fails
    }
  };

  return { optimizeText };
};
```

---

## Integration Steps

1. **Install dependencies**:
   ```bash
   npm install groq-sdk docx html2pdf.js
   ```

2. **Set environment variables**:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Create the form component** in your "Lebenslauf erstellen" section
4. **Wire up Groq optimization** on field blur (after user finishes typing)
5. **Add template selector** dropdown/grid
6. **Connect PDF/DOCX export** endpoints
7. **Test end-to-end**: Form → Optimization → Preview → Export

---

## Key Design Decisions

✅ **Real-time optimization**: Users see suggestions as they type (better UX than batch optimization at end)
✅ **Groq not Claude**: Faster, cheaper, perfect for real-time use
✅ **Reactive Resume schema**: Industry-standard format, easy to extend
✅ **Multiple export formats**: PDF for sharing, DOCX for further editing
✅ **Graceful fallback**: If optimization fails, keep original text
✅ **TailwindCSS templates**: No custom CSS nightmares
✅ **Progressive enhancement**: Works without optimization, better with it

---

## Next Steps

1. Start with form + preview (core UX)
2. Add Groq optimization for 1-2 high-impact fields (job description, summary)
3. Add PDF export (simpler than DOCX)
4. Add DOCX export
5. Polish templates based on user feedback
6. Expand optimization to more fields if needed
