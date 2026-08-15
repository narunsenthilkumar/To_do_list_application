import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DiagnosticsService } from './DiagnosticsService';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { Spacing, TypographyScale, Radii } from '../theme/tokens';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred.' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    DiagnosticsService.log('error', 'ui', error.message, {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <AlertCircle size={44} color="#FF3B30" style={{ marginBottom: Spacing.md }} />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.description}>
              Your local task data is safe. The interface encountered an issue.
            </Text>
            <Text style={styles.errorSnippet} numberOfLines={3}>
              {this.state.errorMessage}
            </Text>
            <AnimatedPressable profile="primaryButton" onPress={this.handleReset} style={styles.btn}>
              <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnText}>Reload Screen</Text>
            </AnimatedPressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: '#000000',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
  },
  title: {
    ...TypographyScale.title2,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  description: {
    ...TypographyScale.body,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorSnippet: {
    ...TypographyScale.caption1,
    color: '#FF453A',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.pill,
    width: '100%',
  },
  btnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
