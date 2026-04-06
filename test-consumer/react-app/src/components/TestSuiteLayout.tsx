import React from "react";
import {
  Box,
  Container,
  Divider,
  Typography,
  type ContainerProps,
} from "@mui/material";

interface TestSuiteLayoutProps {
  title: string;
  description: React.ReactNode;
  headerContent?: React.ReactNode;
  progressContent: React.ReactNode;
  contentTitle?: string;
  children: React.ReactNode;
  maxWidth?: ContainerProps["maxWidth"];
}

const TestSuiteLayout: React.FC<TestSuiteLayoutProps> = ({
  title,
  description,
  headerContent,
  progressContent,
  contentTitle,
  children,
  maxWidth = "lg",
}) => {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        {description}
      </Typography>

      {headerContent && <Box sx={{ mb: 3 }}>{headerContent}</Box>}

      <Divider sx={{ mb: 3 }} />

      {progressContent}

      <Divider sx={{ mb: 3 }} />

      {contentTitle && (
        <Typography variant="h5" component="h2" gutterBottom>
          {contentTitle}
        </Typography>
      )}

      {children}
    </Container>
  );
};

export default TestSuiteLayout;
