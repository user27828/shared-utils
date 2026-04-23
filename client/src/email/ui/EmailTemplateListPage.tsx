import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type {
  EmailTemplateCategory,
  EmailTemplateSummary,
} from "../../../../utils/src/email/types.js";

export interface EmailTemplateListPageProps {
  templates: EmailTemplateSummary[];
  isLoading?: boolean;
  error?: Error | string | null;
  onOpenTemplate: (template: EmailTemplateSummary) => void;
}

const EmailTemplateListPage: React.FC<EmailTemplateListPageProps> = ({
  templates,
  isLoading = false,
  error,
  onOpenTemplate,
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<EmailTemplateCategory | "all">(
    "all",
  );

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesCategory =
        category === "all" || template.category === category;
      const matchesSearch =
        !search ||
        `${template.name} ${template.uid} ${template.description}`
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [category, search, templates]);

  const categories = useMemo(() => {
    return Array.from(new Set(templates.map((template) => template.category)));
  }, [templates]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Email Templates
        </Typography>
        <Typography color="text.secondary">
          Browse registered templates, preview fixtures, and validate rendered
          HTML and plain text output.
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          label="Search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          fullWidth
        />
        <TextField
          select
          label="Category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as EmailTemplateCategory | "all");
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="all">All categories</MenuItem>
          {categories.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error ? (
        <Alert severity="error">
          {typeof error === "string" ? error : error.message}
        </Alert>
      ) : null}

      {isLoading ? (
        <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : null}

      {!isLoading && filteredTemplates.length === 0 ? (
        <Alert severity="info">No email templates matched your filters.</Alert>
      ) : null}

      <Stack spacing={2}>
        {filteredTemplates.map((template) => (
          <Card key={template.uid} variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h6">{template.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {template.uid}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip label={template.category} size="small" />
                    <Chip
                      label={`${template.fixtureCount} fixture${template.fixtureCount === 1 ? "" : "s"}`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Stack>

                <Typography color="text.secondary">
                  {template.description}
                </Typography>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {template.sendScenarios.map((scenario) => (
                    <Chip
                      key={scenario}
                      label={scenario}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>

                <Box>
                  <Button
                    variant="contained"
                    onClick={() => {
                      onOpenTemplate(template);
                    }}
                  >
                    Open preview
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
};

export default EmailTemplateListPage;